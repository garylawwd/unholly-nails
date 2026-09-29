"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, KeyboardEvent } from "react";
import { collectionGroup, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";

export interface Product {
  id: string;
  docPath: string; 
  name: string;
  basePrice: number;
  priceOnAsk: boolean;
  imagePath: string;
  additionalImages: string[];
  description?: string;
  defaultShape?: string;
  defaultLength?: string;
  isPromo: boolean;
  category: string;
  tags: string[];
  syncId: string;
  isForSale?: boolean;
}

const SHAPE_OPTIONS = ["Almond", "Coffin", "Square", "Stiletto"];
const LENGTH_OPTIONS = ["XS", "S", "M", "L", "Custom"];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [bagCount, setBagCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [selectedShape, setSelectedShape] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ribbonCollections, setRibbonCollections] = useState<{tag: string, title: string}[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "0TMvGP1VIja7VzVM87MPQaacoY03";
      
      // Fetch Ribbon Collections
      const ribbonSnap = await getDocs(query(collection(db, "users", vendorUid, "collection_settings"), where("inRibbon", "==", true)));
      const ribbons = ribbonSnap.docs.map(d => ({ 
        tag: d.data().tag, 
        title: d.data().title || d.data().tag,
        description: d.data().description || "",
        backgroundImageUrl: d.data().backgroundImageUrl || "",
        ombreStart: d.data().ombreStart || "#f472b6",
        ombreEnd: d.data().ombreEnd || "#000000",
        bgScale: d.data().bgScale || 100
      }));
      setRibbonCollections(ribbons as any);

      const q = query(collection(db, "users", vendorUid, "nail_sets"), where("isForSale", "==", true));

      const snapshot = await getDocs(q);

      // Fetch the Android app's separate multi-photo collection
      const imagesSnapshot = await getDocs(collectionGroup(db, "set_images"));
      const allSetImages = imagesSnapshot.docs.map(doc => doc.data());

      const fetchedProducts = snapshot.docs.map(d => {
        const data = d.data();
        const syncId = data.syncId || d.id;
        
        // Helper to reconstruct Firebase Storage URLs from local Android paths
        const formatImageUrl = (url: string) => {
          if (url && !url.startsWith('http')) {
            const filename = url.split('/').pop();
            const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "0TMvGP1VIja7VzVM87MPQaacoY03";
            return filename ? `https://firebasestorage.googleapis.com/v0/b/presson-pro.firebasestorage.app/o/users%2F${vendorUid}%2Fimages%2F${filename}?alt=media` : url;
          }
          return url;
        };

        // Extract extra photos uploaded via Android app
        const androidExtraImages = allSetImages
          .filter(img => img.setSyncId === syncId && img.uri)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(img => formatImageUrl(img.uri as string));

        // Merge web-uploaded images (additionalImages array) with Android-uploaded images
        const mergedExtraImages = Array.from(new Set([...(data.additionalImages || []).map(formatImageUrl), ...androidExtraImages]));

        let primaryImage = data.imagePath;
        if ((!primaryImage || !primaryImage.startsWith('http')) && mergedExtraImages.length > 0) {
          primaryImage = mergedExtraImages.find(img => img.startsWith("http")) || mergedExtraImages[0];
        } else {
          primaryImage = formatImageUrl(primaryImage);
        }

        // Ensure the primary image isn't duplicated in the gallery carousel
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
          category: data.category || 'Uncategorized',
          tags: data.tags || [],
          syncId: syncId,
        } as Product;
      });

      const uniqueProducts = Array.from(new Map(fetchedProducts.map(item => [item.id, item])).values());

      setProducts(uniqueProducts);
    } catch (error) {
      console.error("Error fetching nail sets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct || editingProduct || showLogin) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedProduct, editingProduct, showLogin]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLogin(false);
      setEditMode(true);
    } catch (err: any) {
      setLoginError(err.message || "Failed to login with Google");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setEditMode(false);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && editingProduct && !editingProduct.tags.includes(newTag)) {
        setEditingProduct({ ...editingProduct, tags: [...editingProduct.tags, newTag] });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      tags: editingProduct.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      const pRef = doc(db, editingProduct.docPath);
      let newImagePath = editingProduct.imagePath;
      let newAdditionalImages = [...(editingProduct.additionalImages || [])];
      
      if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
        const files = Array.from(fileInputRef.current.files);
        for (const file of files) {
          const storageReference = ref(storage, `users/${adminUser?.uid}/images/storefront_${Date.now()}_${file.name}`);
          await uploadBytes(storageReference, file);
          const url = await getDownloadURL(storageReference);
          
          if (newImagePath.includes("unsplash") || !newImagePath) {
             newImagePath = url;
          } else {
             newAdditionalImages.push(url);
          }
        }
      }

      await updateDoc(pRef, {
        name: editingProduct.name,
        basePrice: Number(editingProduct.basePrice),
        priceOnAsk: editingProduct.priceOnAsk,
        description: editingProduct.description,
        defaultShape: editingProduct.defaultShape,
        defaultLength: editingProduct.defaultLength,
        isPromo: editingProduct.isPromo,
        tags: editingProduct.tags,
        imagePath: newImagePath,
        additionalImages: newAdditionalImages
      });

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { 
        ...editingProduct, 
        imagePath: newImagePath,
        additionalImages: newAdditionalImages
      } : p));
      
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating:", error);
      alert("Failed to save. Make sure your user has write permissions in Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const openDrawer = (product: Product) => {
    setSelectedProduct(product);
    setSelectedShape(product.defaultShape || "Almond");
    setSelectedSize(product.defaultLength || "M");
  };

  const closeDrawer = () => {
    setSelectedProduct(null);
  };

  const handleAddToBag = () => {
    setBagCount((prev) => prev + 1);
    closeDrawer();
  };

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

  const promoProducts = useMemo(() => products.filter(p => p.isPromo), [products]);
  
  // dynamicFilters and displayedProducts removed since ribbon acts as global nav

  return (
    <div className="min-h-screen font-sans bg-[#FFF5F8] text-[#1A1A1A] pb-24 selection:bg-pink-200 selection:text-pink-900 relative">
      {/* Seamless Soft Pink Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#FF5C9D] rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.12] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#FF5C9D] rounded-full mix-blend-multiply filter blur-[200px] opacity-[0.12] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] left-[30%] w-[50%] h-[50%] bg-[#FFB6D5] rounded-full mix-blend-multiply filter blur-[250px] opacity-[0.08] pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {adminUser && (
          <div className="bg-neutral-900 text-white px-4 py-2 text-sm flex justify-between items-center z-50 relative">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-pink-400">Admin Logged In</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} className="accent-pink-500 w-4 h-4" />
                Enable Edit Mode
              </label>
              <Link href="/admin" className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 text-xs rounded-md font-bold transition-colors ml-2 shadow-sm">
                Go to Admin Dashboard →
              </Link>
            </div>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-white underline text-xs">Logout</button>
          </div>
        )}

        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl shadow-sm border-b border-pink-100/50 flex items-center justify-between px-4 sm:px-6 h-14">
          {/* Ribbon Navigation */}
          <div className="flex gap-6 sm:gap-10 overflow-x-auto hide-scrollbar flex-1 items-center">
            <Link href="/" className="text-[11px] sm:text-xs font-bold text-black hover:text-[#FF5C9D] transition-colors whitespace-nowrap uppercase tracking-[0.2em]">
              HOME
            </Link>
            <Link href="/collections/special-offers" className="text-[11px] sm:text-xs font-bold text-[#FF5C9D] hover:text-pink-400 transition-colors whitespace-nowrap uppercase tracking-[0.2em]">
              {ribbonCollections.find((r: any) => r.tag === 'special-offers')?.title || "SPECIAL OFFERS"}
            </Link>
            <Link href="/collections/all" className="text-[11px] sm:text-xs font-bold text-neutral-500 hover:text-black transition-colors whitespace-nowrap uppercase tracking-[0.2em]">
              {ribbonCollections.find((r: any) => r.tag === 'all')?.title || "ALL DESIGNS"}
            </Link>
            {ribbonCollections.filter((rib: any) => rib.tag !== 'special-offers' && rib.tag !== 'all').map((rib: any) => (
              <Link key={rib.tag} href={`/collections/${rib.tag}`} className="text-[11px] sm:text-xs font-bold text-neutral-500 hover:text-black transition-colors whitespace-nowrap uppercase tracking-[0.2em]">
                {rib.title}
              </Link>
            ))}
          </div>
          
          {/* Shopping Bag */}
          <div className="flex items-center pl-4 border-l border-pink-100">
            <button className="relative p-2 text-neutral-700 hover:text-[#FF5C9D] transition-colors" aria-label="Shopping Bag">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              {bagCount > 0 && <span className="absolute top-0 right-0 bg-[#FF5C9D] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{bagCount}</span>}
            </button>
          </div>
        </header>

        <main className="w-full flex-grow flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div></div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="relative w-full h-[70vh] min-h-[500px] flex flex-col items-center justify-center pt-10 pb-20">
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
                  <Image 
                    src="/logo_cropped.png" 
                    alt="UnHolly Nails" 
                    width={360} 
                    height={150} 
                    className="w-56 sm:w-80 h-auto object-contain mb-8" 
                    priority 
                  />
                  <h1 className="text-4xl sm:text-6xl font-black text-black mb-6 uppercase tracking-tighter leading-none">
                    Luxury Hand-Painted<br/>Press-On Nails
                  </h1>
                  <p className="text-lg sm:text-xl text-neutral-500 mb-10 font-medium max-w-2xl">Salon-quality custom nail sets perfectly sized and delivered directly to your door.</p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Link href="/collections/all" className="bg-black text-white px-10 py-4 rounded-full font-black text-xs tracking-widest uppercase hover:bg-neutral-800 hover:scale-105 transition-all shadow-xl">Shop All Designs</Link>
                    <Link href="/collections/special-offers" className="bg-white border border-pink-200 text-black px-10 py-4 rounded-full font-black text-xs tracking-widest uppercase hover:border-black hover:scale-105 transition-all shadow-xl">View Promos</Link>
                  </div>
                </div>
              </div>

              {/* Section Divider */}
              <div className="max-w-xs mx-auto h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent"></div>

              {/* Featured Collections Grid */}
              {ribbonCollections.length > 0 && (
                <div className="py-24 px-4 sm:px-6 w-full relative z-20">
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                      <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black">Featured Collections</h2>
                      <p className="text-neutral-500 font-medium">Explore our exclusive themed sets hand-painted just for you.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {ribbonCollections.map((collection: any) => (
                        <Link key={collection.tag} href={`/collections/${collection.tag}`} className="group relative h-96 rounded-[2rem] overflow-hidden shadow-lg border border-pink-100/50 block transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                          <div className="absolute inset-0 bg-neutral-900 transition duration-700 group-hover:scale-110" style={{ background: `linear-gradient(to bottom right, ${collection.ombreStart || '#f472b6'}, ${collection.ombreEnd || '#000000'})` }}>
                            {collection.backgroundImageUrl && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div style={{ transform: `scale(${(collection.bgScale || 100) / 100})`, width: '100%', height: '100%', position: 'relative' }}>
                                  <Image src={collection.backgroundImageUrl} alt={collection.title || "Background"} fill className="object-cover opacity-60 mix-blend-overlay" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                          <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end h-full z-10">
                            <span className="text-pink-300 font-bold text-[10px] tracking-widest uppercase mb-2 drop-shadow-md">Collection</span>
                            <h3 className="text-4xl font-black text-white mb-2 uppercase drop-shadow-lg leading-none" style={{ color: collection.headerColor || '#ffffff' }}>{collection.title}</h3>
                            <p className="text-neutral-300 font-medium line-clamp-2 text-sm">{collection.description || "View this collection →"}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section Divider */}
              <div className="max-w-xs mx-auto h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent"></div>

              {/* New Arrivals */}
              {products.length > 0 && (
                <div className="py-24 px-4 sm:px-6 w-full relative z-20">
                  <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-16 gap-6">
                      <div className="text-center sm:text-left">
                        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black">New Arrivals</h2>
                        <p className="text-neutral-500 font-medium">Fresh out of the studio. Grab them before they're gone.</p>
                      </div>
                      <Link href="/collections/all" className="bg-black text-white px-8 py-4 rounded-full font-bold text-xs hover:bg-[#FF5C9D] uppercase tracking-widest transition-colors whitespace-nowrap shadow-md">View All Designs →</Link>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                      {products.slice(0, 8).map((product) => (
                        <div key={product.id} className={`bg-white/60 backdrop-blur-md rounded-3xl p-4 shadow-sm border ${editMode ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-pink-100/50'} flex flex-col group relative transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl`}>
                          {editMode && (
                            <button onClick={() => setEditingProduct(product)} className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold z-20 hover:bg-neutral-800 shadow-md">✏️ Edit</button>
                          )}
                          {product.isPromo && (
                            <div className="absolute top-5 left-5 bg-[#FF5C9D] text-white text-[9px] font-bold px-3 py-1.5 rounded-full z-10 shadow-sm uppercase tracking-widest">PROMO</div>
                          )}
                          <div className="relative aspect-square overflow-hidden rounded-2xl bg-pink-50 cursor-pointer mb-5" onClick={() => !editMode && openDrawer(product)}>
                            <Image src={product.imagePath} alt={product.name} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" sizes="(max-width: 640px) 50vw, 25vw" />
                          </div>
                          <div className="flex flex-col flex-grow px-2">
                            <h3 className="text-base sm:text-lg font-black text-neutral-900 truncate mb-1">{product.name}</h3>
                            <p className={`font-bold text-sm mb-6 ${product.priceOnAsk ? 'text-[#FF5C9D]' : 'text-neutral-500'}`}>
                              {product.priceOnAsk ? "Price on Ask" : `€${product.basePrice.toFixed(2)}`}
                            </p>
                            
                            {editMode && product.tags && product.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {product.tags.map(t => <span key={t} className="bg-pink-50 text-pink-700 text-[10px] px-2 py-0.5 rounded-md border border-pink-200">{t}</span>)}
                              </div>
                            )}

                            {!editMode && (
                              <div className="mt-auto">
                                <button onClick={() => openDrawer(product)} className="w-full bg-white text-black px-4 py-3.5 rounded-xl text-xs font-black transition-colors hover:bg-black hover:text-white uppercase tracking-widest border border-pink-100">Select Options</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="mt-20 py-8 text-center text-neutral-400 text-xs">
          <button onDoubleClick={() => setShowLogin(true)} className="hover:text-neutral-600 transition-colors">© {new Date().getFullYear()} UnHolly Nails. All rights reserved.</button>
        </footer>

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLogin(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center text-black">
            <h2 className="text-xl font-black mb-4">Store Admin Login</h2>
            <p className="text-sm text-neutral-500 mb-6">Sign in with your authorized Google account to manage the storefront.</p>
            {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{loginError}</div>}
            <button onClick={() => handleLogin()} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Sign in with Google
            </button>
            <button onClick={() => setShowLogin(false)} className="mt-4 text-xs text-neutral-400 hover:text-black">Cancel</button>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 text-black">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-neutral-100 px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-black text-lg">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="text-neutral-500 hover:text-black font-bold">Close X</button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-5">
              <form id="editForm" onSubmit={handleSaveEdit} className="space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Name</label>
                    <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1 flex justify-between">
                      Price (€)
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] text-pink-600">
                        <input type="checkbox" checked={editingProduct.priceOnAsk} onChange={e => setEditingProduct({...editingProduct, priceOnAsk: e.target.checked})} className="accent-pink-500" />
                        Price on Ask (POA)
                      </label>
                    </label>
                    <input type="number" step="0.01" disabled={editingProduct.priceOnAsk} value={editingProduct.priceOnAsk ? "" : editingProduct.basePrice} onChange={e => setEditingProduct({...editingProduct, basePrice: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 disabled:bg-neutral-100 disabled:text-neutral-400" required={!editingProduct.priceOnAsk} />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Tags / Pins</label>
                  <div className="border rounded-xl p-3 bg-white min-h-[3rem] flex flex-wrap gap-2 items-center focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                    {editingProduct.tags?.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="w-4 h-4 rounded-full hover:bg-pink-200 flex items-center justify-center text-xs ml-1">×</button>
                      </span>
                    ))}
                    <input type="text" list="existing-tags" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Type or select a tag and press Enter..." className="flex-1 min-w-[220px] outline-none text-sm bg-transparent" />
                    <datalist id="existing-tags">
                      {Array.from(new Set(products.flatMap(p => p.tags || []))).map(tag => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wide">Sets tagged with the same pin automatically create a category filter on the storefront.</p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input type="checkbox" checked={editingProduct.isPromo} onChange={e => setEditingProduct({...editingProduct, isPromo: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                    Show in Special Offers (Promo)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Default Shape</label>
                    <select value={editingProduct.defaultShape || ''} onChange={e => setEditingProduct({...editingProduct, defaultShape: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                      {SHAPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Default Length</label>
                    <select value={editingProduct.defaultLength || ''} onChange={e => setEditingProduct({...editingProduct, defaultLength: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                      {LENGTH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Description</label>
                  <textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 h-24" />
                </div>

                <div className="p-4 border rounded-xl bg-neutral-50">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Upload Multiple Photos</label>
                  <div className="flex items-center gap-4 mb-4">
                    <input type="file" ref={fileInputRef} accept="image/*" multiple className="text-sm flex-1 bg-white border p-2 rounded-lg" />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className="relative w-full aspect-square rounded overflow-hidden border-2 border-pink-400">
                      <Image src={editingProduct.imagePath} alt="main" fill className="object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">Main</div>
                    </div>
                    {editingProduct.additionalImages?.map((url, idx) => (
                      <div key={idx} className="relative w-full aspect-square rounded overflow-hidden border group">
                        <Image src={url} alt={`extra-${idx}`} fill className="object-cover" />
                        <button type="button" onClick={() => {
                          const updated = editingProduct.additionalImages.filter((_, i) => i !== idx);
                          setEditingProduct({...editingProduct, additionalImages: updated});
                        }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="bg-neutral-50 p-4 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingProduct(null)} className="px-5 py-2 font-bold text-neutral-600 hover:text-black">Cancel</button>
              <button form="editForm" type="submit" disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2">
                {saving ? "Uploading & Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && !editMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center text-black">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeDrawer} aria-hidden="true" />
          <div className="relative w-full sm:w-[480px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-transform animate-slide-up">
            <button onClick={closeDrawer} className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-2 rounded-full text-black hover:bg-neutral-100 transition shadow-sm" aria-label="Close drawer">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="overflow-y-auto w-full hide-scrollbar">
              <div className="relative group">
                <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                  <div className="relative aspect-square w-full shrink-0 snap-center bg-pink-50">
                    <Image src={selectedProduct.imagePath} alt={selectedProduct.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
                  </div>
                  {selectedProduct.additionalImages?.map((url, idx) => (
                    <div key={idx} className="relative aspect-square w-full shrink-0 snap-center bg-pink-50 border-l border-white">
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
                
                <p className={`text-lg font-medium mb-6 ${selectedProduct.priceOnAsk ? 'text-pink-600 font-bold' : 'text-neutral-600'}`}>
                  {selectedProduct.priceOnAsk ? "Price on Ask" : `€${selectedProduct.basePrice.toFixed(2)}`}
                </p>
                
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Shape</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPE_OPTIONS.map(shape => (
                      <label key={shape} className={`cursor-pointer text-center px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${selectedShape === shape ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}>
                        <input type="radio" className="hidden" name="shape" value={shape} checked={selectedShape === shape} onChange={(e) => setSelectedShape(e.target.value)} />
                        {shape}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Size / Length</h3>
                    <button className="text-xs text-neutral-500 underline underline-offset-2">Sizing Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LENGTH_OPTIONS.map(size => (
                      <label key={size} className={`cursor-pointer flex-1 min-w-[3rem] py-3 flex items-center justify-center rounded-xl text-sm font-semibold border transition-all ${selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}>
                        <input type="radio" className="hidden" name="size" value={size} checked={selectedSize === size} onChange={(e) => setSelectedSize(e.target.value)} />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>
                {selectedProduct.description && (
                  <div className="mt-2 text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-white border-t border-neutral-100 flex-shrink-0">
              <button 
                onClick={selectedProduct.priceOnAsk ? () => alert("Redirect to contact form...") : handleAddToBag} 
                className="w-full bg-black text-white font-bold text-base py-4 rounded-xl hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                {selectedProduct.priceOnAsk ? "Inquire for Quote" : `Add to Bag — €${selectedProduct.basePrice.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
