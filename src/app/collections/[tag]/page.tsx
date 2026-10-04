"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dancing_Script } from "next/font/google";
import { useParams } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, collectionGroup, getDoc, doc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const dancingScript = Dancing_Script({ subsets: ["latin"] });
import { db, auth, storage } from "@/lib/firebase";
import { useCart } from "@/context/CartContext";
import { useAdmin } from "@/context/AdminContext";
import { Product } from "@/lib/types";

const SHAPE_OPTIONS = ["Almond", "Stiletto", "Coffin", "Square", "Oval", "Round", "Other"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "Other"];
const LENGTH_OPTIONS = ["XS", "S", "M", "L", "XL", "Other"];

import ItemPickerModal from "@/components/ItemPickerModal";

export default function CollectionPage() {
  const params = useParams();
  // Ensure we safely handle array params or string params
  const rawTag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag;
  const tag = rawTag ? decodeURIComponent(rawTag) : "";

  const [products, setProducts] = useState<Product[]>([]);
  const [collectionInfo, setCollectionInfo] = useState<{ title: string; description: string; backgroundImageUrl: string; headerColor?: string; descriptionColor?: string; ombreStart?: string; ombreEnd?: string; bgScale?: number; inRibbon?: boolean; tag?: string; includedProductIds?: string[]; itemOrder?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('newest'); // 'newest', 'oldest', 'az', 'za'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [itemToRemove, setItemToRemove] = useState<Product | null>(null);

  // Drawer state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>("Almond");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedLength, setSelectedLength] = useState<string>("Medium");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const { addToCart } = useCart();
  const { editMode, setEditingProduct } = useAdmin();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

  // Admin inline editing state
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollGallery = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      scrollContainerRef.current.scrollBy({ 
        left: direction === 'left' ? -clientWidth : clientWidth, 
        behavior: 'smooth' 
      });
    }
  };

  useEffect(() => {
    if (!tag) return;
    fetchCollectionData();
  }, [tag]);

  const fetchCollectionData = async () => {
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      
      let currentSettings: any = null;

      // 1. Fetch Collection Info
      const settingsRef = doc(db, "users", vendorUid, "collection_settings", tag);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        currentSettings = settingsSnap.data();
        setCollectionInfo(currentSettings);
      } else {
        // Fallback default info if no custom splashback is set
        let fallbackTitle = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, " ");
        let fallbackDesc = `Explore our gorgeous ${tag.replace(/-/g, " ")} collection.`;
        
        if (tag === "special-offers") {
          fallbackTitle = "Special Offers";
          fallbackDesc = "Check out our latest deals and promos!";
        } else if (tag === "all") {
          fallbackTitle = "All Designs";
          fallbackDesc = "Browse our entire collection of custom press-ons.";
        }

        currentSettings = {
          title: fallbackTitle,
          description: fallbackDesc,
          backgroundImageUrl: "",
          headerColor: "#ffffff",
          descriptionColor: "#e5e5e5",
          ombreStart: "#f472b6",
          ombreEnd: "#000000",
          bgScale: 100
        };
        setCollectionInfo(currentSettings);
      }

      // 2. Fetch Products (Bypass Firebase composite index by filtering in JS)
      const baseQuery = collection(db, "users", vendorUid, "nail_sets");
      const q = query(baseQuery, where("isForSale", "==", true));
      const snapshot = await getDocs(q);

      // Fetch the Android app's separate multi-photo collection
      const imagesSnapshot = await getDocs(collectionGroup(db, "set_images"));
      const allSetImages = imagesSnapshot.docs.map(doc => doc.data());

      let fetchedProducts = snapshot.docs.map(d => {
        const data = d.data();
        const syncId = data.syncId || d.id;
        
        // Helper to reconstruct Firebase Storage URLs from local Android paths just in case
        const formatImageUrl = (url: string) => {
          if (url && !url.startsWith('http')) {
            const filename = url.split('/').pop();
            return filename ? `https://firebasestorage.googleapis.com/v0/b/presson-pro.firebasestorage.app/o/users%2F${vendorUid}%2Fimages%2F${filename}?alt=media` : url;
          }
          return url;
        };

        const androidExtraImages = allSetImages
          .filter(img => img.setSyncId === syncId && img.uri)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(img => formatImageUrl(img.uri as string));

        const mergedExtraImages = Array.from(new Set([...(data.additionalImages || []).map(formatImageUrl), ...androidExtraImages]));

        let primaryImage = data.imagePath;
        if ((!primaryImage || !primaryImage.startsWith('http')) && mergedExtraImages.length > 0) {
          primaryImage = mergedExtraImages.find(img => img.startsWith("http")) || mergedExtraImages[0];
        } else {
          primaryImage = formatImageUrl(primaryImage);
        }

        const finalExtraImages = mergedExtraImages.filter(img => img !== primaryImage);

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
          category: data.category || 'Standard',
          tags: data.tags || [],
          syncId,
          type: data.type || 'Sets',
          updatedAt: data.updatedAt || 0
        };
      });

      // Filter products based on the current collection tag
      if (tag === "special-offers") {
        fetchedProducts = fetchedProducts.filter(p => p.isPromo);
      } else if (tag !== "all") {
        const topLevelMap: Record<string, string> = {
          "sets": "Sets",
          "minis": "Minis",
          "keychains": "Keychains",
          "keyrings": "Keychains",
          "earrings": "Earrings",
          "accessories": "Accessories",
          "basics": "Basics",
          "sizing-kit": "Sizing Kit"
        };
        const mappedType = topLevelMap[tag.toLowerCase()];
        if (mappedType) {
          if (mappedType === "Basics") {
            fetchedProducts = fetchedProducts.filter(p => p.type?.toLowerCase() === "basics" || p.type?.toLowerCase() === "sizing kit" || (p.tags && p.tags.map((t: string)=>t.toLowerCase()).includes("basics")));
          } else {
            fetchedProducts = fetchedProducts.filter(p => p.type?.toLowerCase() === mappedType.toLowerCase() || (p.tags && p.tags.map((t: string)=>t.toLowerCase()).includes(mappedType.toLowerCase())));
          }
        } else {
          const includedIds = currentSettings?.includedProductIds;
          if (includedIds && includedIds.length > 0) {
            fetchedProducts = fetchedProducts.filter(p => includedIds.includes(p.id));
            // Sort custom collection by includedProductIds array order
            fetchedProducts.sort((a, b) => includedIds.indexOf(a.id) - includedIds.indexOf(b.id));
          } else {
            fetchedProducts = fetchedProducts.filter(p => p.tags && p.tags.includes(tag));
          }
        }
      }

      // If there's an explicit itemOrder on this collection (e.g. for a core tag), apply it
      if (currentSettings?.itemOrder && currentSettings.itemOrder.length > 0) {
        fetchedProducts.sort((a, b) => {
          const aIdx = currentSettings.itemOrder!.indexOf(a.id);
          const bIdx = currentSettings.itemOrder!.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
      }

      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching collection:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const openDrawer = (product: Product) => {
    setSelectedProduct(product);
    setSelectedShape(clientProfile?.defaultShape || product.defaultShape || "Almond");
    setSelectedSize(clientProfile ? "Profile Sizes" : "M");
    setSelectedLength(clientProfile?.defaultLength || product.defaultLength || "M");
    setSelectedQuantity(1);
  };

  const closeDrawer = () => {
    setSelectedProduct(null);
  };

  const handleAddToBag = () => {
    if (selectedProduct) {
      const name = selectedProduct.name.toLowerCase();
      const isSizingKit = name.includes('sizing');
      const isMiniSet = name.includes('mini') || name.includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some((t: string) => t.toLowerCase() === 'minis');
      
      const finalSize = isSizingKit ? 'N/A' : selectedSize;
      const finalShape = isMiniSet ? 'N/A' : selectedShape;
      const finalLength = isMiniSet ? 'N/A' : selectedLength;

      addToCart(selectedProduct, finalShape, finalSize, finalLength, selectedQuantity);
      closeDrawer();
    }
  };

  // Admin auth detection + current user tracking
  useEffect(() => {
    const VALID_ADMINS = ["0TMvGP1VIja7VzVM87MPQaacoY03", "CMzpkonBxKeLboaVTUYwDWgiwNG3"];
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u && VALID_ADMINS.includes(u.uid)) {
        setAdminUser(u);
      } else {
        setAdminUser(null);
      }
      if (u && u.email) {
        try {
          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
          const q = query(collection(db, "users", vendorUid, "clients"), where("email", "==", u.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setClientProfile(snap.docs[0].data());
          }
        } catch (e) { console.error("Failed to fetch client profile", e); }
      }
    });
    return () => unsub();
  }, []);

  const openInlineEditor = () => {
    setEditData({ ...collectionInfo });
    setShowEditor(true);
  };

  const saveInlineEdits = async () => {
    if (!adminUser || !editData) return;
    setSavingEdit(true);
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      let newImageUrl = editData.backgroundImageUrl;

      if (bgFileRef.current?.files && bgFileRef.current.files.length > 0) {
        const file = bgFileRef.current.files[0];
        const storageRef = ref(storage, `users/${vendorUid}/images/bg_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        newImageUrl = await getDownloadURL(storageRef);
      }

      const updatedMeta = { ...editData, backgroundImageUrl: newImageUrl || '', tag };
      await setDoc(doc(db, 'users', vendorUid, 'collection_settings', tag), updatedMeta);
      setCollectionInfo(updatedMeta);
      setShowEditor(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen selection:bg-pink-100 relative bg-neutral-900">
      {/* Full Page Background (Gradient + Optional Image Overlay) */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none" 
        style={{ background: `linear-gradient(to bottom right, ${collectionInfo?.ombreStart || '#f472b6'}, ${collectionInfo?.ombreEnd || '#000000'})` }}
      >
        {collectionInfo?.backgroundImageUrl && (
          <>
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <div style={{ transform: `scale(${(collectionInfo?.bgScale || 100) / 100})`, width: '100%', height: '100%', position: 'relative' }}>
                <Image src={collectionInfo.backgroundImageUrl} alt={collectionInfo?.title || "Background"} fill className="object-contain opacity-50 mix-blend-overlay" priority />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80"></div>
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">




        <div className="pt-16 pb-6 sm:pt-28 sm:pb-12 text-center px-4 relative mt-4">
          {adminUser && editMode && (
              <button 
                onClick={openInlineEditor}
              className={`absolute top-4 right-6 sm:top-12 sm:right-8 bg-black/70 text-white p-3 rounded-full hover:bg-black transition-all shadow-lg z-30 group ${editMode ? 'ring-2 ring-pink-500 animate-pulse' : ''}`}
              title="Theme Collection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
            </button>
          )}
          <div className="flex flex-col items-center gap-4 relative z-10 w-full max-w-4xl mx-auto">
            <div className="relative group/title flex justify-center w-full">
              {editMode ? (
                <input 
                  type="text"
                  value={collectionInfo?.title || tag}
                  onChange={e => setCollectionInfo((prev: any) => ({...prev, title: e.target.value}))}
                  onBlur={async (e) => {
                    if(!adminUser) return;
                    const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                    await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { title: e.target.value }, { merge: true });
                  }}
                  className={`relative z-50 pointer-events-auto ${dancingScript.className} text-6xl sm:text-8xl drop-shadow-2xl bg-transparent border-none outline-none text-center hover:ring-2 ring-pink-500 rounded p-2`} 
                  style={{ color: collectionInfo?.headerColor || "#ffffff", minWidth: '300px' }}
                />
              ) : (
                <h1 
                  className={`${dancingScript.className} text-6xl sm:text-8xl drop-shadow-2xl`} 
                  style={{ color: collectionInfo?.headerColor || "#ffffff" }}
                >
                  {collectionInfo?.title || tag}
                </h1>
              )}
              {editMode && (
                <div className="absolute -right-2 sm:-right-14 top-0 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center bg-white rounded-full p-2 shadow-xl opacity-100 transition-opacity z-[60]">
                  <input type="color" value={collectionInfo?.headerColor || '#ffffff'} onChange={async (e) => {
                    setCollectionInfo((prev: any) => ({...prev, headerColor: e.target.value}));
                    if(!adminUser) return;
                    const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                    await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { headerColor: e.target.value }, { merge: true });
                  }} className="w-8 h-8 rounded cursor-pointer border-0 p-0" title="Title Color" />
                </div>
              )}
            </div>

            {(collectionInfo?.description || editMode) && (
              <div className="relative group/desc flex justify-center w-full">
                {editMode ? (
                  <textarea 
                    value={collectionInfo?.description || ''}
                    onChange={e => setCollectionInfo((prev: any) => ({...prev, description: e.target.value}))}
                    onBlur={async (e) => {
                      if(!adminUser) return;
                      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                      await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { description: e.target.value }, { merge: true });
                    }}
                    className="relative z-50 pointer-events-auto text-lg sm:text-xl font-medium drop-shadow-md w-full max-w-2xl bg-transparent border-none outline-none text-center hover:ring-2 ring-pink-500 rounded p-2 resize-none overflow-hidden"
                    style={{ color: collectionInfo?.descriptionColor || '#e5e5e5' }}
                    rows={2}
                    placeholder="Collection description..."
                  />
                ) : (
                  <p 
                    className="text-lg sm:text-xl font-medium drop-shadow-md max-w-2xl text-center"
                    style={{ color: collectionInfo?.descriptionColor || '#e5e5e5' }}
                  >{collectionInfo?.description}</p>
                )}
                {editMode && (
                  <div className="absolute -right-2 sm:-right-14 top-0 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center bg-white rounded-full p-2 shadow-xl opacity-100 transition-opacity z-[60]">
                    <input type="color" value={collectionInfo?.descriptionColor || '#e5e5e5'} onChange={async (e) => {
                      setCollectionInfo((prev: any) => ({...prev, descriptionColor: e.target.value}));
                      if(!adminUser) return;
                      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                      await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { descriptionColor: e.target.value }, { merge: true });
                    }} className="w-8 h-8 rounded cursor-pointer border-0 p-0" title="Description Color" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 mb-20 w-full flex-grow">
          {/* Top Control Bar (Filter/Sort) */}
          {/* Top Control Bar (Filter/Sort) */}
          <div className="flex justify-end items-center mb-6">
            <button 
              onClick={() => setShowFilterModal(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition backdrop-blur-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
              Filter & Sort
              {activeFilters.length > 0 && <span className="ml-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilters.length}</span>}
            </button>
          </div>

          {showFilterModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}></div>
              <div className="bg-white rounded-3xl w-full max-w-md p-6 relative z-10 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-black">Filter & Sort</h3>
                  <button onClick={() => setShowFilterModal(false)} className="p-2 text-neutral-400 hover:text-black">✕</button>
                </div>
                
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">Sort By</h4>
                  <select 
                    value={sortOption} 
                    onChange={e => setSortOption(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-black px-4 py-3 rounded-xl font-bold appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest to Oldest</option>
                    <option value="oldest">Oldest to Newest</option>
                    <option value="az">A to Z (Ascending)</option>
                    <option value="za">Z to A (Descending)</option>
                  </select>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">Filter By Style</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(products.flatMap(p => p.tags || []))).sort().map(chip => (
                      <button
                        key={chip}
                        onClick={() => setActiveFilters(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeFilters.includes(chip) ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-100">
                  <button 
                    onClick={() => { setActiveFilters([]); setSortOption('newest'); }}
                    className="px-6 py-3 rounded-xl font-bold text-neutral-500 hover:bg-neutral-100 transition flex-1"
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => setShowFilterModal(false)}
                    className="px-6 py-3 bg-[#FF5C9D] text-white rounded-xl font-bold hover:bg-pink-600 transition flex-1 shadow-lg shadow-pink-500/30"
                  >
                    Apply Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
          ) : products.length === 0 && !editMode ? (
            <div className="text-center py-20 px-4 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">No designs found</h3>
              <p className="text-neutral-400">There are currently no items in this collection.</p>
              <Link href="/" className="inline-block mt-6 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition">Back to Store</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {editMode && (
                <div 
                  onClick={() => setShowItemPicker(true)}
                  className="bg-white/50 backdrop-blur-md rounded-2xl p-3 shadow-inner border-2 border-dashed border-pink-300 flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50 transition-colors min-h-[200px]"
                >
                  <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                    +
                  </div>
                  <span className="font-bold text-pink-600 text-center uppercase tracking-widest text-xs">
                    {['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'special-offers'].includes(tag.toLowerCase()) || tag === 'all' ? 'Publish Unlisted Items' : 'Add Items to Collection'}
                  </span>
                </div>
              )}
              {(() => {
                let displayed = products.filter(p => activeFilters.length === 0 || activeFilters.some(f => p.tags?.includes(f)));
                if (sortOption === 'az') displayed.sort((a, b) => a.name.localeCompare(b.name));
                else if (sortOption === 'za') displayed.sort((a, b) => b.name.localeCompare(a.name));
                else if (sortOption === 'oldest') displayed.sort((a, b) => (a.updatedAt && b.updatedAt) ? a.updatedAt - b.updatedAt : a.id.localeCompare(b.id)); 
                else {
                  // For 'newest', if we have a custom item order, we maintain the array's current order (which we sorted in fetchProducts).
                  // Otherwise, we sort by newest.
                  const hasCustomOrder = collectionInfo?.itemOrder?.length || collectionInfo?.includedProductIds?.length;
                  if (!hasCustomOrder) {
                    displayed.sort((a, b) => (a.updatedAt && b.updatedAt) ? b.updatedAt - a.updatedAt : b.id.localeCompare(a.id));
                  }
                }
                return displayed;
              })().map((product, index) => (
                <div 
                  key={product.id} 
                  draggable={editMode && sortOption === 'newest' && activeFilters.length === 0}
                  onDragStart={(e) => {
                    if (editMode && sortOption === 'newest' && activeFilters.length === 0) {
                      setDraggedItemIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedItemIndex === null || draggedItemIndex === index) return;
                    if (editMode && sortOption === 'newest' && activeFilters.length === 0) {
                      setProducts(prev => {
                        const newProducts = [...prev];
                        const item = newProducts[draggedItemIndex];
                        if (!item) return prev;
                        newProducts.splice(draggedItemIndex, 1);
                        newProducts.splice(index, 0, item);
                        return newProducts;
                      });
                      setDraggedItemIndex(index);
                    }
                  }}
                  onDragEnd={async () => {
                    setDraggedItemIndex(null);
                    if (editMode && sortOption === 'newest' && activeFilters.length === 0) {
                      const newOrder = products.map(p => p.id);
                      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                      
                      // Save to the appropriate array (includedProductIds for custom collections, itemOrder for core tags)
                      const isCoreTag = ['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'special-offers'].includes(tag.toLowerCase()) || tag === 'all';
                      if (!isCoreTag) {
                        await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { includedProductIds: newOrder }, { merge: true });
                        setCollectionInfo((prev: any) => ({...prev, includedProductIds: newOrder}));
                      } else {
                        await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { itemOrder: newOrder }, { merge: true });
                        setCollectionInfo((prev: any) => ({...prev, itemOrder: newOrder}));
                      }
                    }
                  }}
                  className={`bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border ${editMode ? 'border-pink-500 ring-2 ring-pink-500/20 cursor-grab active:cursor-grabbing' : 'border-white/20'} flex flex-col group relative transform transition-all hover:-translate-y-1 ${draggedItemIndex === index ? 'opacity-50 scale-95' : ''}`}
                >
                  {editMode && (
                    <div className="absolute top-4 right-4 flex gap-1 z-20">
                      <button onClick={() => setEditingProduct(product)} className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-neutral-800 shadow-md">✏️ EDIT</button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToRemove(product);
                        }}
                        className="bg-red-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold hover:bg-red-600 shadow-md"
                        title="Remove Item"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {product.isPromo && (
                    <div className="absolute top-4 left-4 bg-pink-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full z-10 shadow-sm uppercase tracking-wider">PROMO</div>
                  )}
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50 cursor-pointer" onClick={() => !editMode && openDrawer(product)}>
                    <Image src={product.imagePath} alt={product.name} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    {editMode && product.tags && product.tags.length > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10">
                        {product.tags.map(t => <span key={t} className="bg-black/70 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col flex-grow">
                    <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate">{product.name}</h2>
                    <p className={`font-medium text-sm mt-0.5 mb-3 ${product.priceOnAsk ? 'text-pink-600 font-bold' : 'text-neutral-600'}`}>
                      {product.priceOnAsk ? "Price on Ask" : `€${product.basePrice.toFixed(2)}`}
                    </p>
                    {!editMode && (
                      <div className="mt-auto">
                        <button onClick={() => openDrawer(product)} className="w-full bg-black text-white px-4 py-2.5 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-800">Select Options</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeDrawer} aria-hidden="true" />
          <div className="relative w-full sm:w-[480px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-transform animate-slide-up">
            <button onClick={closeDrawer} className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-2 rounded-full text-black hover:bg-neutral-100 transition shadow-sm" aria-label="Close drawer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="overflow-y-auto w-full hide-scrollbar">
              <div className="relative group">
                <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                  <div className="relative aspect-[4/3] w-full shrink-0 snap-center bg-pink-50">
                    <Image src={selectedProduct.imagePath} alt={selectedProduct.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
                  </div>
                  {selectedProduct.additionalImages?.map((url, idx) => (
                    <div key={idx} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-pink-50 border-l border-white">
                      <Image src={url} alt={`${selectedProduct.name} ${idx}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
                    </div>
                  ))}
                </div>
                
                {(selectedProduct.additionalImages?.length || 0) > 0 && (
                  <>
                    <button onClick={() => scrollGallery('left')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-black opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button onClick={() => scrollGallery('right')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-black opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                  </>
                )}
              </div>
              
              {(selectedProduct.additionalImages?.length || 0) > 0 && (
                <div className="flex justify-center gap-1.5 mt-3 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/60"></div>
                  {selectedProduct.additionalImages?.map((_, idx) => (
                    <div key={idx} className="w-1.5 h-1.5 rounded-full bg-black/20"></div>
                  ))}
                </div>
              )}

              <div className="p-5 sm:p-6 pb-6">
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedProduct.tags?.map(t => <span key={t} className="bg-pink-50 text-pink-700 text-[10px] px-2 py-0.5 rounded-md border border-pink-200">{t}</span>)}
                </div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">{selectedProduct.name}</h2>
                
                <p className={`text-lg font-medium mb-4 ${selectedProduct.priceOnAsk ? 'text-pink-600 font-bold' : 'text-neutral-600'}`}>
                  {selectedProduct.priceOnAsk ? "Price on Ask" : `€${selectedProduct.basePrice.toFixed(2)}`}
                </p>
                {selectedProduct.description && (
                  <p className="text-neutral-500 text-sm leading-relaxed mb-5 whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                )}
                
                {!(selectedProduct.name.toLowerCase().includes('mini') || selectedProduct.name.toLowerCase().includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some(t => t.toLowerCase() === 'minis')) && (
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Shape</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SHAPE_OPTIONS.map(shape => (
                        <label key={shape} className={`cursor-pointer text-center px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${selectedShape === shape ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}>
                          <input type="radio" className="hidden" name="shape" value={shape} checked={selectedShape === shape} onChange={(e) => setSelectedShape(e.target.value)} />
                          {shape}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {!selectedProduct.name.toLowerCase().includes('sizing') && (
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Size</h3>
                      <Link href="/guides" className="text-xs text-neutral-500 underline underline-offset-2 hover:text-black">Sizing Guide</Link>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {currentUser && (
                        <label className={`cursor-pointer w-full py-2.5 flex items-center justify-center rounded-xl text-sm font-semibold border transition-all ${selectedSize === 'Profile Sizes' ? 'bg-black text-white border-black' : 'bg-pink-50 text-pink-700 border-pink-200 hover:border-pink-300'}`}>
                          <input type="radio" className="hidden" name="size" value="Profile Sizes" checked={selectedSize === 'Profile Sizes'} onChange={(e) => setSelectedSize(e.target.value)} />
                          ✨ Use My Saved Sizes ✨
                        </label>
                      )}
                      {SIZE_OPTIONS.map(size => (
                        <label key={size} className={`cursor-pointer flex-1 min-w-[3rem] py-2.5 flex items-center justify-center rounded-xl text-sm font-semibold border transition-all ${selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}>
                          <input type="radio" className="hidden" name="size" value={size} checked={selectedSize === size} onChange={(e) => setSelectedSize(e.target.value)} />
                          {size}
                        </label>
                      ))}
                    </div>
                    {!currentUser && (
                      <p className="text-[10px] text-neutral-500 text-center italic mt-1">
                        💡 Tip: Setting up a profile lets you save your exact custom sizes for faster checkouts!
                      </p>
                    )}
                  </div>
                )}

                {!(selectedProduct.name.toLowerCase().includes('mini') || selectedProduct.name.toLowerCase().includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some(t => t.toLowerCase() === 'minis')) && (
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Length</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {LENGTH_OPTIONS.map(length => (
                        <label key={length} className={`cursor-pointer text-center px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${selectedLength === length ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}>
                          <input type="radio" className="hidden" name="length" value={length} checked={selectedLength === length} onChange={(e) => setSelectedLength(e.target.value)} />
                          {length}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-white border-t border-neutral-100 flex-shrink-0 flex items-center gap-4">
              <div className="flex items-center border border-neutral-200 rounded-xl px-2 h-[56px]">
                <button onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))} className="p-2 text-neutral-500 hover:text-black w-8 h-full flex items-center justify-center font-bold text-lg">-</button>
                <span className="px-2 font-bold text-sm min-w-[2rem] text-center">{selectedQuantity}</span>
                <button onClick={() => setSelectedQuantity(selectedQuantity + 1)} className="p-2 text-neutral-500 hover:text-black w-8 h-full flex items-center justify-center font-bold text-lg">+</button>
              </div>
              <button 
                onClick={handleAddToBag} 
                className="flex-grow bg-black text-white font-bold text-base py-4 rounded-xl hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10 active:scale-[0.98] h-[56px]"
              >
                {selectedProduct.priceOnAsk ? "Add to Request — POA" : `Add to Bag — €${(selectedProduct.basePrice * selectedQuantity).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Inline Theming Modal */}
      {showEditor && editData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-black animate-slide-up">
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-lg">Theme Collection</h2>
              <button onClick={() => setShowEditor(false)} className="text-neutral-400 hover:text-black text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Ombre Gradient */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Background Gradient</label>
                <div className="flex items-center gap-3 bg-neutral-50 p-4 rounded-2xl border">
                  <input type="color" value={editData.ombreStart || '#f472b6'} onChange={e => setEditData((p: any) => ({ ...p, ombreStart: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                  <div className="flex-1 h-8 rounded-lg shadow-inner" style={{ background: `linear-gradient(to right, ${editData.ombreStart || '#f472b6'}, ${editData.ombreEnd || '#000000'})` }}></div>
                  <input type="color" value={editData.ombreEnd || '#000000'} onChange={e => setEditData((p: any) => ({ ...p, ombreEnd: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                </div>
              </div>

              {/* Splashback Image */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                  Splashback / Overlay Image
                </label>
                <div className="border-2 border-dashed rounded-2xl p-4 bg-neutral-50 space-y-3">
                  {editData.backgroundImageUrl && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm">
                      <Image src={editData.backgroundImageUrl} alt="Current background" fill className="object-cover" />
                    </div>
                  )}
                  <input type="file" ref={bgFileRef} accept="image/*" className="text-sm w-full font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Background Scale: {editData.bgScale || 100}%</label>
                    <input 
                      type="range" min="10" max="300" 
                      value={editData.bgScale || 100}
                      onChange={e => setEditData((p: any) => ({ ...p, bgScale: parseInt(e.target.value) }))}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="sticky bottom-0 bg-white border-t p-4">
              <button 
                onClick={saveInlineEdits} 
                disabled={savingEdit}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Item Modal */}
      {itemToRemove && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setItemToRemove(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-slide-up text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✕</div>
              <h3 className="font-black uppercase tracking-widest text-lg mb-2">Remove Item?</h3>
              <p className="text-neutral-500 text-sm mb-6">
                Are you sure you want to remove <span className="font-bold text-black">"{itemToRemove.name}"</span> from this collection?
                {['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'all'].includes(tag.toLowerCase()) && 
                  <span className="block mt-2 text-red-500 font-bold">This will unlist it from the live store completely!</span>
                }
              </p>
              <div className="flex gap-3">
                <button onClick={() => setItemToRemove(null)} className="flex-1 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancel</button>
                <button 
                  onClick={async () => {
                    const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                    const lowerTag = tag.toLowerCase();
                    
                    try {
                      if (['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'all'].includes(lowerTag)) {
                        await setDoc(doc(db, "users", vendorUid, "nail_sets", itemToRemove.id), { isForSale: false }, { merge: true });
                        setProducts(prev => prev.filter(p => p.id !== itemToRemove.id));
                      } else if (lowerTag === 'special-offers') {
                        await setDoc(doc(db, "users", vendorUid, "nail_sets", itemToRemove.id), { isPromo: false }, { merge: true });
                        setProducts(prev => prev.filter(p => p.id !== itemToRemove.id));
                      } else {
                        const newIds = (collectionInfo?.includedProductIds || []).filter(id => id !== itemToRemove.id);
                        await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { includedProductIds: newIds }, { merge: true });
                        setCollectionInfo((prev: any) => ({...prev, includedProductIds: newIds}));
                        setProducts(prev => prev.filter(p => p.id !== itemToRemove.id));
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    setItemToRemove(null);
                  }} 
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md shadow-red-500/20"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Picker Modal */}
      {showItemPicker && (
        <ItemPickerModal 
          isOpen={showItemPicker}
          onClose={() => setShowItemPicker(false)}
          tag={tag}
          collectionMode={
            tag.toLowerCase() === 'special-offers' ? 'promo' :
            ['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'all'].includes(tag.toLowerCase()) ? 'core' : 'custom'
          }
          currentItems={products}
          onSave={async (selectedIds) => {
            const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
            const mode = tag.toLowerCase() === 'special-offers' ? 'promo' :
              ['sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics', 'all'].includes(tag.toLowerCase()) ? 'core' : 'custom';
            
            try {
              if (mode === 'core') {
                // Publish unlisted items
                for (const pid of selectedIds) {
                  await setDoc(doc(db, "users", vendorUid, "nail_sets", pid), { isForSale: true }, { merge: true });
                }
              } else if (mode === 'promo') {
                const currentPromoIds = products.map(p => p.id);
                const toRemove = currentPromoIds.filter(id => !selectedIds.includes(id));
                const toAdd = selectedIds.filter(id => !currentPromoIds.includes(id));

                for (const pid of toAdd) {
                  // Ensure they are also marked for sale so they show up!
                  await setDoc(doc(db, "users", vendorUid, "nail_sets", pid), { isPromo: true, isForSale: true }, { merge: true });
                }
                for (const pid of toRemove) {
                  await setDoc(doc(db, "users", vendorUid, "nail_sets", pid), { isPromo: false }, { merge: true });
                }
              } else {
                // Save custom collection order
                await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { includedProductIds: selectedIds }, { merge: true });
                setCollectionInfo((prev: any) => ({ ...prev, includedProductIds: selectedIds }));
                // Ensure they are also marked for sale so they show up!
                for (const pid of selectedIds) {
                  await setDoc(doc(db, "users", vendorUid, "nail_sets", pid), { isForSale: true }, { merge: true });
                }
              }
            } catch (e) {
              console.error(e);
            }
            setShowItemPicker(false);
            window.location.reload(); // Quick refresh to grab new items/order easily
          }}
        />
      )}
    </div>
  );
}
