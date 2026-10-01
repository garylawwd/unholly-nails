"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, KeyboardEvent } from "react";
import { collectionGroup, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { useCart } from "@/context/CartContext";
import { useAdmin } from "@/context/AdminContext";

import { Product } from "@/lib/types";

const SHAPE_OPTIONS = ["Almond", "Stiletto", "Coffin", "Square", "Oval", "Round", "Other"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "Other"];
const LENGTH_OPTIONS = ["XS", "S", "M", "L", "XL", "Other"];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { addToCart } = useCart();
  const { editMode, setEditMode, editingProduct, setEditingProduct } = useAdmin();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [selectedShape, setSelectedShape] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedLength, setSelectedLength] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [ribbonCollections, setRibbonCollections] = useState<{tag: string, title: string}[]>([]);

  useEffect(() => {
    const VALID_ADMINS = ["0TMvGP1VIja7VzVM87MPQaacoY03", "CMzpkonBxKeLboaVTUYwDWgiwNG3"];
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && VALID_ADMINS.includes(user.uid)) {
        setAdminUser(user);
      } else {
        setAdminUser(null);
      }
      if (user && user.email) {
        try {
          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
          const q = query(collection(db, "users", vendorUid, "clients"), where("email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setClientProfile(snap.docs[0].data());
          }
        } catch (e) { console.error("Failed to fetch client profile", e); }
      } else {
        setClientProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      
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
            const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct, editingProduct, showLogin]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      const VALID_ADMINS = ["0TMvGP1VIja7VzVM87MPQaacoY03", "CMzpkonBxKeLboaVTUYwDWgiwNG3"];
      if (!VALID_ADMINS.includes(result.user.uid)) {
        await signOut(auth);
        setLoginError("Access Denied: You do not have administrator privileges.");
        return;
      }
      
      setShowLogin(false);
      setEditMode(true);
    } catch (err: any) {
      setLoginError(err.message || "Failed to login with Google");
    }
  };


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
      const isMiniSet = name.includes('mini') || name.includes('kids');
      
      const finalSize = isSizingKit ? 'N/A' : selectedSize;
      const finalShape = isMiniSet ? 'N/A' : selectedShape;
      const finalLength = isMiniSet ? 'N/A' : selectedLength;

      addToCart(selectedProduct, finalShape, finalSize, finalLength, selectedQuantity);
      closeDrawer();
    }
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
        <main className="w-full flex-grow flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div></div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="relative w-full min-h-[70vh] flex flex-col items-center justify-center pt-24 sm:pt-32 pb-16 sm:pb-24">
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

              {/* Sizing Kit Promo Banner */}
              <div className="w-full px-4 sm:px-6 relative z-20 mt-4 mb-16">
                <div className="max-w-5xl mx-auto bg-black rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 transform hover:-translate-y-1 transition-transform duration-300 border border-neutral-800">
                  <div className="text-white text-center md:text-left">
                    <h2 className="text-3xl font-black uppercase tracking-wider mb-2">New to UnHolly Nails?</h2>
                    <p className="text-neutral-400 font-medium max-w-lg">
                      Don't guess your size! Order a sizing kit first to guarantee a flawless, salon-perfect fit for your custom sets.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                    <button 
                      onClick={() => {
                        let kit = products.find(p => p.name.toLowerCase().includes('sizing kit') || p.name.toLowerCase().includes('sizing'));
                        if (!kit) {
                          kit = {
                            id: "placeholder-sizing-kit",
                            docPath: "placeholder/sizing-kit",
                            name: "Sizing Kit",
                            basePrice: 5.00,
                            priceOnAsk: false,
                            imagePath: "/logo_cropped.png",
                            additionalImages: [],
                            description: "Sizing kit to guarantee a flawless fit.",
                            category: "Accessories",
                            tags: [],
                            isForSale: true,
                            isPromo: false,
                            syncId: "sizing-kit",
                            type: "Accessories"
                          } as Product;
                        }
                        addToCart(kit, kit.defaultShape || 'Almond', 'N/A', kit.defaultLength || 'M', 1);
                      }} 
                      className="bg-[#FF5C9D] text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-pink-600 transition-colors shadow-lg whitespace-nowrap"
                    >
                      Order Today
                    </button>
                    <Link href="/guides" className="bg-white text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors shadow-lg whitespace-nowrap text-center">
                      How to measure →
                    </Link>
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

      </div>{/* end z-10 wrapper */}

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
                
                {!selectedProduct.name.toLowerCase().includes('mini') && !selectedProduct.name.toLowerCase().includes('kids') && (
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

                {!selectedProduct.name.toLowerCase().includes('mini') && !selectedProduct.name.toLowerCase().includes('kids') && (
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
    </div>
  );
}
