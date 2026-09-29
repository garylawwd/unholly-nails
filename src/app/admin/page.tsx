"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { collection, collectionGroup, getDocs, doc, writeBatch, setDoc, getDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { Product } from "@/app/page"; // reuse interface

interface CollectionMeta {
  tag: string;
  title: string;
  description: string;
  backgroundImageUrl: string;
  inRibbon?: boolean;
  headerColor?: string;
  headerBgColor?: string;
  descriptionColor?: string;
  ombreStart?: string;
  ombreEnd?: string;
  bgScale?: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"inventory" | "collections">("inventory");
  
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState("");
  
  const [collectionMetadata, setCollectionMetadata] = useState<Record<string, CollectionMeta>>({});
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [savingCollection, setSavingCollection] = useState(false);
  
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        fetchInventory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const fetchInventory = async (uid: string) => {
    setLoadingInventory(true);
    try {
      // Fetch all items for this user (no isForSale filter)
      const q = collection(db, "users", uid, "nail_sets");
      const snapshot = await getDocs(q);
      
      // Fetch the Android app's separate multi-photo collection
      const imagesSnapshot = await getDocs(collectionGroup(db, "set_images"));
      const allSetImages = imagesSnapshot.docs.map(doc => doc.data());

      const items = snapshot.docs.map(d => {
        const data = d.data();
        const syncId = data.syncId || d.id;
        
        const androidExtraImages = allSetImages
          .filter(img => img.setSyncId === syncId && img.uri)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(img => img.uri as string);
          
        let primaryImage = data.imagePath;
        if ((!primaryImage || !primaryImage.startsWith('http')) && androidExtraImages.length > 0) {
          // If the main image is a broken local path, use the first valid cloud photo from the extra images!
          primaryImage = androidExtraImages.find(img => img.startsWith("http")) || androidExtraImages[0];
        }

        // If the Android app saved a local path but successfully uploaded the image bytes to Firebase Storage,
        // we can magically reconstruct the public Firebase Storage URL by extracting the filename!
        if (primaryImage && !primaryImage.startsWith('http')) {
          const filename = primaryImage.split('/').pop();
          if (filename) {
            primaryImage = `https://firebasestorage.googleapis.com/v0/b/presson-pro.firebasestorage.app/o/users%2F${uid}%2Fimages%2F${filename}?alt=media`;
          }
        }

        // Deduplicate the primary image from the extra images list so it's not doubled up
        const finalExtraImages = Array.from(new Set([...(data.additionalImages || []), ...androidExtraImages]))
          .filter(img => img !== primaryImage);

        return {
          id: d.id,
          docPath: d.ref.path,
          name: data.name || 'Unnamed Set',
          basePrice: data.basePrice || 0,
          priceOnAsk: data.priceOnAsk === true,
          imagePath: primaryImage || 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&q=80&w=800',
          additionalImages: finalExtraImages,
          description: data.description || '',
          defaultShape: data.defaultShape || 'Almond',
          defaultLength: data.defaultLength || 'M',
          isPromo: data.isPromo === true,
          category: data.category || 'Uncategorized',
          tags: data.tags || [],
          syncId: syncId,
          isForSale: data.isForSale === true,
        } as Product & { isForSale: boolean };
      });
      setInventory(items);
      
      // Extract unique tags and fetch their metadata
      const tags = new Set<string>();
      items.forEach(i => i.tags?.forEach(t => tags.add(t)));
      
      const metaRecord: Record<string, CollectionMeta> = {};
      for (const tag of Array.from(tags)) {
        const metaDoc = await getDoc(doc(db, "users", uid, "collection_settings", tag));
        if (metaDoc.exists()) {
          metaRecord[tag] = metaDoc.data() as CollectionMeta;
        }
      }
      setCollectionMetadata(metaRecord);

    } catch (error) {
      console.error("Error fetching inventory:", error);
      alert("Error fetching inventory. Check permissions.");
    } finally {
      setLoadingInventory(false);
    }
  };

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    inventory.forEach(p => p.tags?.forEach(t => tags.add(t)));
    
    const arr = Array.from(tags).sort();
    if (!arr.includes("special-offers")) arr.unshift("special-offers");
    if (!arr.includes("all")) arr.unshift("all");
    
    return arr;
  }, [inventory]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === inventory.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(inventory.map(i => i.id)));
  };

  const handleBulkAddTag = async () => {
    if (!user || !bulkTagInput.trim() || selectedIds.size === 0) return;
    const tagToAdd = bulkTagInput.trim();
    
    try {
      const batch = writeBatch(db);
      const updatedInventory = [...inventory];
      
      selectedIds.forEach(id => {
        const itemIndex = updatedInventory.findIndex(i => i.id === id);
        if (itemIndex > -1) {
          const item = updatedInventory[itemIndex];
          if (!item.tags.includes(tagToAdd)) {
            const newTags = [...item.tags, tagToAdd];
            updatedInventory[itemIndex] = { ...item, tags: newTags };
            batch.update(doc(db, item.docPath), { tags: newTags });
          }
        }
      });
      
      await batch.commit();
      setInventory(updatedInventory);
      setBulkTagInput("");
      setSelectedIds(new Set());
      alert(`Tag "${tagToAdd}" added to selected items!`);
    } catch (error) {
      console.error(error);
      alert("Failed to bulk tag.");
    }
  };

  const handleBulkToggleVisibility = async (makeVisible: boolean) => {
    if (!user || selectedIds.size === 0) return;
    try {
      const batch = writeBatch(db);
      const updatedInventory = [...inventory];
      
      selectedIds.forEach(id => {
        const itemIndex = updatedInventory.findIndex(i => i.id === id);
        if (itemIndex > -1) {
          updatedInventory[itemIndex] = { ...updatedInventory[itemIndex], isForSale: makeVisible };
          batch.update(doc(db, updatedInventory[itemIndex].docPath), { isForSale: makeVisible });
        }
      });
      
      await batch.commit();
      setInventory(updatedInventory);
      setSelectedIds(new Set());
    } catch (error) {
      console.error(error);
      alert("Failed to update visibility.");
    }
  };

  const saveCollectionMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTag) return;
    
    setSavingCollection(true);
    try {
      const meta = collectionMetadata[selectedTag] || { 
        tag: selectedTag, 
        title: selectedTag, 
        description: "", 
        backgroundImageUrl: "", 
        inRibbon: false,
        headerColor: "#ffffff",
        headerBgColor: "#ffffff",
        descriptionColor: "#e5e5e5",
        ombreStart: "#f472b6",
        ombreEnd: "#000000",
        bgScale: 100
      };
      let newImageUrl = meta.backgroundImageUrl;

      if (bgInputRef.current?.files && bgInputRef.current.files.length > 0) {
        const file = bgInputRef.current.files[0];
        const storageReference = ref(storage, `users/${user.uid}/images/bg_${Date.now()}_${file.name}`);
        await uploadBytes(storageReference, file);
        newImageUrl = await getDownloadURL(storageReference);
      }

      const updatedMeta = { ...meta, backgroundImageUrl: newImageUrl || "" };
      await setDoc(doc(db, "users", user.uid, "collection_settings", selectedTag), updatedMeta);
      
      setCollectionMetadata(prev => ({ ...prev, [selectedTag]: updatedMeta }));
      alert("Collection settings saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save collection settings.");
    } finally {
      setSavingCollection(false);
    }
  };

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-neutral-500 mb-6 text-sm">Please sign in to manage your store.</p>
          <button onClick={handleLogin} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-black text-xl tracking-tight">UnHolly Admin</h1>
          <p className="text-xs text-neutral-500 mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === "inventory" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            📦 Inventory Master
          </button>
          <button 
            onClick={() => setActiveTab("collections")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === "collections" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            🎨 Collection Pages
          </button>
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => signOut(auth)} className="w-full text-left px-4 py-2 text-sm text-red-500 font-bold hover:bg-red-50 rounded-lg transition">Log Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        
        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <div className="p-8">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black mb-2">Inventory Master</h2>
                <p className="text-neutral-500 text-sm">Manage all your designs, including private portfolio items.</p>
              </div>
            </header>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="bg-pink-100 border border-pink-200 rounded-2xl p-4 mb-6 flex items-center gap-4 sticky top-4 z-10 shadow-lg shadow-pink-100/50">
                <span className="font-bold text-pink-800 bg-pink-200 px-3 py-1 rounded-full text-sm">{selectedIds.size} selected</span>
                
                <div className="flex bg-white rounded-lg p-1 border ml-auto shadow-sm">
                  <input type="text" value={bulkTagInput} onChange={e => setBulkTagInput(e.target.value)} placeholder="e.g. Halloween" className="px-3 text-sm outline-none" />
                  <button onClick={handleBulkAddTag} className="bg-black text-white px-4 py-1.5 rounded text-sm font-bold">Add Tag</button>
                </div>

                <div className="h-6 w-px bg-pink-300 mx-2"></div>
                
                <button onClick={() => handleBulkToggleVisibility(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition">Publish to Store</button>
                <button onClick={() => handleBulkToggleVisibility(false)} className="bg-neutral-800 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition">Hide from Store</button>
              </div>
            )}

            {loadingInventory ? (
              <div className="animate-pulse flex space-x-4"><div className="h-10 bg-neutral-200 rounded w-full"></div></div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 border-b">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" onChange={toggleAll} checked={selectedIds.size === inventory.length && inventory.length > 0} className="w-4 h-4 accent-black" /></th>
                      <th className="p-4 font-bold">Item</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Price</th>
                      <th className="p-4 font-bold">Tags (Pins)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventory.map(item => {
                      // @ts-ignore - isForSale exists on our DB object but might be missing from Product interface in page.tsx
                      const isPublic = item.isForSale;
                      return (
                        <tr key={item.id} className={`hover:bg-neutral-50 transition ${selectedIds.has(item.id) ? 'bg-pink-50' : ''}`}>
                          <td className="p-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="w-4 h-4 accent-black" /></td>
                          <td className="p-4 flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-neutral-100 rounded-lg overflow-hidden relative border shrink-0">
                                {item.imagePath && <Image src={item.imagePath} alt="" fill className="object-cover" />}
                                {!item.imagePath && (
                                  <div className="absolute inset-0 flex items-center justify-center text-[8px] text-center text-neutral-400 font-bold p-1 leading-tight">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <span className="font-bold">{item.name}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 font-mono">Found {item.additionalImages?.length || 0} extra pics in DB</span>
                          </td>
                          <td className="p-4">
                            {isPublic ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Live on Store</span> : <span className="bg-neutral-100 text-neutral-500 px-2 py-1 rounded text-xs font-bold">Hidden</span>}
                          </td>
                          <td className="p-4 font-medium">{item.priceOnAsk ? <span className="text-pink-600 text-xs font-bold">POA</span> : `€${item.basePrice.toFixed(2)}`}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {item.tags?.map(t => <span key={t} className="bg-neutral-100 border text-neutral-600 text-[10px] px-2 py-0.5 rounded-full">{t}</span>)}
                              {(!item.tags || item.tags.length === 0) && <span className="text-neutral-400 italic text-xs">No tags</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COLLECTIONS TAB */}
        {activeTab === "collections" && (
          <div className="p-8">
            <header className="mb-8">
              <h2 className="text-3xl font-black mb-2">Collection Designer</h2>
              <p className="text-neutral-500 text-sm">Design custom landing pages for your tagged collections (e.g. Halloween).</p>
            </header>

            <div className="flex gap-8 items-start">
              <div className="w-1/3 bg-white border rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold mb-4 px-2 text-neutral-500 text-xs uppercase tracking-wider">Your Tags</h3>
                <div className="space-y-1">
                  {uniqueTags.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => setSelectedTag(tag)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition font-bold flex justify-between items-center ${selectedTag === tag ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'hover:bg-neutral-50 border border-transparent'}`}
                    >
                      {tag}
                      {collectionMetadata[tag]?.backgroundImageUrl && <span className="text-[10px] bg-pink-100 text-pink-500 px-2 py-0.5 rounded-full">Designed</span>}
                    </button>
                  ))}
                  {uniqueTags.length === 0 && <p className="text-sm text-neutral-400 italic px-2">No tags found in inventory yet.</p>}
                </div>
              </div>

              <div className="flex-1 bg-white border rounded-2xl shadow-sm overflow-hidden">
                {!selectedTag ? (
                  <div className="p-12 text-center text-neutral-400">
                    <span className="text-4xl mb-4 block">👈</span>
                    <p>Select a tag from the left to design its landing page.</p>
                  </div>
                ) : (
                  <form onSubmit={saveCollectionMeta} className="flex flex-col h-full">
                    <div className="p-6 border-b bg-neutral-50 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-xl">Design /{selectedTag}</h3>
                        <p className="text-xs text-neutral-500 mt-1">unhollynails.com/collections/{selectedTag.toLowerCase().replace(/\s+/g, '-')}</p>
                      </div>
                      <button type="submit" disabled={savingCollection} className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-neutral-800 disabled:opacity-50">
                        {savingCollection ? "Saving..." : "Save Page Design"}
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Display Title</label>
                        <input 
                          type="text" 
                          value={collectionMetadata[selectedTag]?.title || selectedTag} 
                          onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), title: e.target.value, tag: selectedTag}}))}
                          className="w-full border rounded-xl px-4 py-3 font-bold text-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Description / Subtitle (Optional)</label>
                        <textarea 
                          value={collectionMetadata[selectedTag]?.description || ""} 
                          onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), description: e.target.value, tag: selectedTag}}))}
                          className="w-full border rounded-xl px-4 py-3 h-24"
                          placeholder="Get ready for spooky season..."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Title Text Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={collectionMetadata[selectedTag]?.headerColor || "#ffffff"}
                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), headerColor: e.target.value, tag: selectedTag}}))}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-sm font-mono">{collectionMetadata[selectedTag]?.headerColor || "#ffffff"}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Header BG Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={collectionMetadata[selectedTag]?.headerBgColor || "#ffffff"}
                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), headerBgColor: e.target.value, tag: selectedTag}}))}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-sm font-mono">{collectionMetadata[selectedTag]?.headerBgColor || "#ffffff"}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Description Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={collectionMetadata[selectedTag]?.descriptionColor || "#e5e5e5"}
                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), descriptionColor: e.target.value, tag: selectedTag}}))}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-sm font-mono">{collectionMetadata[selectedTag]?.descriptionColor || "#e5e5e5"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Ombre Gradient</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={collectionMetadata[selectedTag]?.ombreStart || "#f472b6"} onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), ombreStart: e.target.value, tag: selectedTag}}))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                          <div className="flex-1 h-8 rounded-lg" style={{ background: `linear-gradient(to right, ${collectionMetadata[selectedTag]?.ombreStart || '#f472b6'}, ${collectionMetadata[selectedTag]?.ombreEnd || '#000000'})` }}></div>
                          <input type="color" value={collectionMetadata[selectedTag]?.ombreEnd || "#000000"} onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), ombreEnd: e.target.value, tag: selectedTag}}))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2 flex justify-between">
                          <span>Custom Splashback / Overlay Image</span>
                          <span className="text-pink-500 font-normal">Optional</span>
                        </label>
                        <div className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center bg-neutral-50 hover:bg-neutral-100 transition relative overflow-hidden group">
                          {collectionMetadata[selectedTag]?.backgroundImageUrl && (
                            <div className="absolute inset-0 z-0 opacity-50 group-hover:opacity-20 transition flex items-center justify-center">
                              <div style={{ transform: `scale(${(collectionMetadata[selectedTag]?.bgScale || 100) / 100})`, width: '100%', height: '100%', position: 'relative' }}>
                                <Image src={collectionMetadata[selectedTag].backgroundImageUrl} alt="bg" fill className="object-cover" />
                              </div>
                            </div>
                          )}
                          <div className="relative z-10 flex flex-col items-center bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm w-full max-w-sm">
                            <input type="file" ref={bgInputRef} accept="image/*" className="text-sm w-full mb-4" />
                            
                            <div className="w-full">
                              <label className="block text-xs font-bold text-neutral-500 mb-1">Image Scale: {collectionMetadata[selectedTag]?.bgScale || 100}%</label>
                              <input 
                                type="range" 
                                min="10" max="300" 
                                value={collectionMetadata[selectedTag]?.bgScale || 100}
                                onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), bgScale: parseInt(e.target.value), tag: selectedTag}}))}
                                className="w-full accent-pink-500"
                              />
                            </div>
                            
                            <p className="text-[10px] text-neutral-500 mt-3 text-center leading-tight">Upload a transparent PNG to overlay on top of the ombre, or a full photo.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">
                          <input 
                            type="checkbox" 
                            checked={collectionMetadata[selectedTag]?.inRibbon || false}
                            onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), inRibbon: e.target.checked, tag: selectedTag}}))}
                            className="w-5 h-5 accent-pink-500"
                          />
                          <div>
                            <span className="font-bold block">Show in Storefront Ribbon Menu</span>
                            <span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>
                          </div>
                        </label>
                      </div>

                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
