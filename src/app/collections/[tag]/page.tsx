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
}

const SHAPE_OPTIONS = ["Almond", "Square", "Coffin", "Stiletto", "Oval"];
const LENGTH_OPTIONS = ["XS", "S", "M", "L", "XL"];

export default function CollectionPage() {
  const params = useParams();
  // Ensure we safely handle array params or string params
  const rawTag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag;
  const tag = rawTag ? decodeURIComponent(rawTag) : "";

  const [products, setProducts] = useState<Product[]>([]);
  const [collectionInfo, setCollectionInfo] = useState<{ title: string; description: string; backgroundImageUrl: string; headerColor?: string; headerBgColor?: string; descriptionColor?: string; ombreStart?: string; ombreEnd?: string; bgScale?: number; inRibbon?: boolean; tag?: string; } | null>(null);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedShape, setSelectedShape] = useState<string>("Almond");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [bagCount, setBagCount] = useState(0);

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
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "0TMvGP1VIja7VzVM87MPQaacoY03";
      
      // 1. Fetch Collection Info
      const settingsRef = doc(db, "users", vendorUid, "collection_settings", tag);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setCollectionInfo(settingsSnap.data() as any);
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

        setCollectionInfo({
          title: fallbackTitle,
          description: fallbackDesc,
          backgroundImageUrl: "",
          headerColor: "#ffffff",
          headerBgColor: "#ffffff",
          descriptionColor: "#e5e5e5",
          ombreStart: "#f472b6",
          ombreEnd: "#000000",
          bgScale: 100
        });
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
          syncId
        };
      });

      // Filter products based on the current collection tag
      if (tag === "special-offers") {
        fetchedProducts = fetchedProducts.filter(p => p.isPromo);
      } else if (tag !== "all") {
        fetchedProducts = fetchedProducts.filter(p => p.tags && p.tags.includes(tag));
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
  }, [selectedProduct]);

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

  // Admin auth detection
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAdminUser(u);
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
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || '0TMvGP1VIja7VzVM87MPQaacoY03';
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
              <div style={{ transform: `scale(${(collectionInfo.bgScale || 100) / 100})`, width: '100%', height: '100%', position: 'relative' }}>
                <Image src={collectionInfo.backgroundImageUrl} alt={collectionInfo.title || "Background"} fill className="object-cover opacity-50 mix-blend-overlay" priority />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80"></div>
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {adminUser && (
          <div className="bg-neutral-900 text-white px-4 py-2 text-sm flex justify-between items-center z-[60] relative">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-pink-400">Admin Logged In</span>
              <span className="text-xs text-neutral-400">Collection Page Editor</span>
              <Link href="/admin" className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 text-xs rounded-md font-bold transition-colors ml-2 shadow-sm">
                Go to Admin Dashboard →
              </Link>
            </div>
          </div>
        )}

        <header 
          className="sticky top-0 left-0 right-0 h-24 backdrop-blur-md z-40 border-b border-pink-100/50 flex items-center justify-between px-4 sm:px-6"
          style={{ backgroundColor: collectionInfo?.headerBgColor ? `${collectionInfo.headerBgColor}cc` : 'rgba(255,255,255,0.8)' }}
        >
          <div className="flex-1">
            <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-black flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              Back to Store
            </Link>
          </div>
          <div className="flex justify-center items-center h-full flex-1 py-2">
            <Link href="/" className="flex justify-center items-center h-full">
              <Image src="/logo_cropped.png" alt="UnHolly Nails" width={400} height={160} className="h-full w-auto object-contain" priority />
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <button className="relative p-2" aria-label="Shopping Bag">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              {bagCount > 0 && <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{bagCount}</span>}
            </button>
          </div>
        </header>

        <div className="pt-8 pb-6 sm:pt-16 sm:pb-12 text-center px-4 relative mt-4">
          {adminUser && (
            <button 
              onClick={openInlineEditor}
              className="absolute top-0 right-6 sm:top-4 sm:right-8 bg-black/70 text-white p-3 rounded-full hover:bg-black transition-all shadow-lg z-30 group"
              title="Edit Collection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
            </button>
          )}
          <h1 
            className={`${dancingScript.className} text-6xl sm:text-8xl drop-shadow-2xl`} 
            style={{ color: collectionInfo?.headerColor || "#ffffff" }}
          >
            {collectionInfo?.title || tag}
          </h1>
          {collectionInfo?.description && (
            <p 
              className="mt-4 text-lg sm:text-xl font-medium drop-shadow-md max-w-2xl mx-auto"
              style={{ color: collectionInfo?.descriptionColor || '#e5e5e5' }}
            >{collectionInfo.description}</p>
          )}
        </div>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 mb-20 w-full flex-grow">
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 px-4 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">No designs found</h3>
              <p className="text-neutral-400">There are currently no items in this collection.</p>
              <Link href="/" className="inline-block mt-6 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition">Back to Store</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/20 flex flex-col group relative transform transition-transform hover:-translate-y-1">
                  {product.isPromo && (
                    <div className="absolute top-4 left-4 bg-pink-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full z-10 shadow-sm uppercase tracking-wider">PROMO</div>
                  )}
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50 cursor-pointer" onClick={() => openDrawer(product)}>
                    <Image src={product.imagePath} alt={product.name} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                  </div>
                  <div className="mt-3 flex flex-col flex-grow">
                    <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate">{product.name}</h2>
                    <p className={`font-medium text-sm mt-0.5 mb-3 ${product.priceOnAsk ? 'text-pink-600 font-bold' : 'text-neutral-600'}`}>
                      {product.priceOnAsk ? "Price on Ask" : `€${product.basePrice.toFixed(2)}`}
                    </p>
                    <div className="mt-auto">
                      <button onClick={() => openDrawer(product)} className="w-full bg-black text-white px-4 py-2.5 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-800">Select Options</button>
                    </div>
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

      {/* Admin Inline Editor Panel */}
      {showEditor && editData && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="ml-auto relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto text-black">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-lg">Edit Collection</h2>
              <button onClick={() => setShowEditor(false)} className="text-neutral-400 hover:text-black text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Display Title</label>
                <input 
                  type="text" 
                  value={editData.title || ''} 
                  onChange={e => setEditData((p: any) => ({ ...p, title: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3 font-bold text-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Description / Subtitle</label>
                <textarea 
                  value={editData.description || ''} 
                  onChange={e => setEditData((p: any) => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3 h-24"
                  placeholder="Your collection description..."
                />
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Title Color</label>
                  <div className="flex flex-col items-center gap-1">
                    <input type="color" value={editData.headerColor || '#ffffff'} onChange={e => setEditData((p: any) => ({ ...p, headerColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                    <span className="text-[10px] font-mono text-neutral-400">{editData.headerColor || '#ffffff'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Header BG</label>
                  <div className="flex flex-col items-center gap-1">
                    <input type="color" value={editData.headerBgColor || '#ffffff'} onChange={e => setEditData((p: any) => ({ ...p, headerBgColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                    <span className="text-[10px] font-mono text-neutral-400">{editData.headerBgColor || '#ffffff'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Desc Color</label>
                  <div className="flex flex-col items-center gap-1">
                    <input type="color" value={editData.descriptionColor || '#e5e5e5'} onChange={e => setEditData((p: any) => ({ ...p, descriptionColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                    <span className="text-[10px] font-mono text-neutral-400">{editData.descriptionColor || '#e5e5e5'}</span>
                  </div>
                </div>
              </div>

              {/* Ombre Gradient */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Ombre Gradient</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editData.ombreStart || '#f472b6'} onChange={e => setEditData((p: any) => ({ ...p, ombreStart: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                  <div className="flex-1 h-8 rounded-lg" style={{ background: `linear-gradient(to right, ${editData.ombreStart || '#f472b6'}, ${editData.ombreEnd || '#000000'})` }}></div>
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
                    <div className="relative w-full h-32 rounded-xl overflow-hidden">
                      <Image src={editData.backgroundImageUrl} alt="Current background" fill className="object-cover" />
                    </div>
                  )}
                  <input type="file" ref={bgFileRef} accept="image/*" className="text-sm w-full" />
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Scale: {editData.bgScale || 100}%</label>
                    <input 
                      type="range" min="10" max="300" 
                      value={editData.bgScale || 100}
                      onChange={e => setEditData((p: any) => ({ ...p, bgScale: parseInt(e.target.value) }))}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ribbon Toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition">
                <input 
                  type="checkbox" 
                  checked={editData.inRibbon || false}
                  onChange={e => setEditData((p: any) => ({ ...p, inRibbon: e.target.checked }))}
                  className="w-5 h-5 accent-pink-500"
                />
                <div>
                  <span className="font-bold block text-sm">Show in Ribbon Menu</span>
                  <span className="text-xs text-neutral-500">Pin to the homepage navigation.</span>
                </div>
              </label>
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
    </div>
  );
}
