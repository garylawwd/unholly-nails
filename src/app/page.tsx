"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, KeyboardEvent } from "react";
import { collectionGroup, collection, getDocs, doc, updateDoc, query, where, getDoc, setDoc } from "firebase/firestore";
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

    const [allCollections, setAllCollections] = useState<any[]>([]);
  const [showFeaturePicker, setShowFeaturePicker] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const cardBgFileRef = useRef<HTMLInputElement>(null);

  const [homeContent, setHomeContent] = useState({
    heroTitle: "Luxury Hand-Painted<br/>Press-On Nails",
    heroSubtitle: "Salon-quality custom nail sets perfectly sized and delivered directly to your door.",
    collectionsTitle: "Featured Collections",
    collectionsSubtitle: "Explore our exclusive themed sets hand-painted just for you.",
    newArrivalsTitle: "New Arrivals",
    newArrivalsSubtitle: "Fresh out of the studio. Grab them before they're gone.",
      featuredProductIds: [] as string[],
    });



  
  const saveInlineEdits = async () => {
    if (!adminUser || !editData) return;
    setSavingEdit(true);
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      let newImageUrl = editData.backgroundImageUrl;
      let newCardImageUrl = editData.cardImageUrl;

      if (bgFileRef.current?.files && bgFileRef.current.files.length > 0) {
        const file = bgFileRef.current.files[0];
        const storageRef = ref(storage, `users/${vendorUid}/images/bg_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        newImageUrl = await getDownloadURL(storageRef);
      }

      if (cardBgFileRef.current?.files && cardBgFileRef.current.files.length > 0) {
        const file = cardBgFileRef.current.files[0];
        const storageRef = ref(storage, `users/${vendorUid}/images/card_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        newCardImageUrl = await getDownloadURL(storageRef);
      }

      const updatedMeta = { ...editData, backgroundImageUrl: newImageUrl || '', cardImageUrl: newCardImageUrl || '' };
      await setDoc(doc(db, 'users', vendorUid, 'collection_settings', editData.tag), updatedMeta, { merge: true });
      
      // Update UI state immediately
      setRibbonCollections((prev: any) => prev.map((c: any) => c.tag === editData.tag ? updatedMeta : c));
      setAllCollections((prev: any) => prev.map((c: any) => c.tag === editData.tag ? updatedMeta : c));
      
      setShowEditor(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save.');
    } finally {
      setSavingEdit(false);
    }
  };


  const fetchProducts = async () => {
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      
      try {
        const homeRef = doc(db, "users", vendorUid, "store_settings", "home_content");
        const homeSnap = await getDoc(homeRef);
        if (homeSnap.exists()) {
          setHomeContent(prev => ({ ...prev, ...homeSnap.data() }));
        }
      } catch (e) {
        console.error("Error fetching home content", e);
      }
      
      // Fetch Ribbon Collections
      
        const allCollSnap = await getDocs(collection(db, "users", vendorUid, "collection_settings"));
        setAllCollections(allCollSnap.docs.map(d => ({ tag: d.id, ...d.data() })));

        const ribbonSnap = await getDocs(query(collection(db, "users", vendorUid, "collection_settings"), where("isFeatured", "==", true)));
      const ribbons = ribbonSnap.docs.map(d => ({ 
        tag: d.data().tag, 
        title: d.data().title || d.data().tag,
        description: d.data().description || "",
        backgroundImageUrl: d.data().backgroundImageUrl || "",
        ombreStart: d.data().ombreStart || "#f472b6",
        ombreEnd: d.data().ombreEnd || "#000000",
        bgScale: d.data().bgScale || 100,
          cardImageUrl: d.data().cardImageUrl || "",
          cardBgScale: d.data().cardBgScale || d.data().bgScale || 100
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
      const isMiniSet = name.includes('mini') || name.includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some((t: string) => t.toLowerCase() === 'minis');
      
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
                  {editMode ? (
                    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
                      <input 
                        type="text" 
                        value={homeContent.heroTitle.replace(/<br\/>/g, ' ')} 
                        onChange={e => setHomeContent(prev => ({...prev, heroTitle: e.target.value}))} 
                        onBlur={async (e) => { 
                          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                          await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { heroTitle: e.target.value }, { merge: true }); 
                        }} 
                        className="relative z-50 pointer-events-auto ring-2 ring-pink-500 rounded-xl p-2 bg-pink-50/50 text-4xl sm:text-6xl font-black text-black text-center uppercase tracking-tighter leading-none w-full"
                      />
                      <textarea 
                        value={homeContent.heroSubtitle.replace(/<br\/>/g, '\n')} 
                        onChange={e => setHomeContent(prev => ({...prev, heroSubtitle: e.target.value}))} 
                        onBlur={async (e) => { 
                          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                          await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { heroSubtitle: e.target.value.replace(/\n/g, '<br/>') }, { merge: true }); 
                        }} 
                        className="relative z-50 pointer-events-auto ring-2 ring-pink-500 rounded p-2 bg-pink-50/50 text-lg sm:text-xl text-neutral-500 text-center w-full resize-none font-medium"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <>
                      <h1 
                        className="text-4xl sm:text-6xl font-black text-black mb-6 uppercase tracking-tighter leading-none"
                        dangerouslySetInnerHTML={{ __html: homeContent.heroTitle }}
                      />
                      <p 
                        className="text-lg sm:text-xl text-neutral-500 mb-10 font-medium max-w-2xl"
                        dangerouslySetInnerHTML={{ __html: homeContent.heroSubtitle }}
                      />
                    </>
                  )}
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
                      {editMode ? (
                        <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
                          <input 
                            type="text" 
                            value={homeContent.collectionsTitle.replace(/<br\/>/g, ' ')} 
                            onChange={e => setHomeContent(prev => ({...prev, collectionsTitle: e.target.value}))} 
                            onBlur={async (e) => { 
                              const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                              await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { collectionsTitle: e.target.value }, { merge: true }); 
                            }} 
                            className="relative z-50 pointer-events-auto ring-2 ring-pink-500 rounded p-2 bg-pink-50/50 text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black text-center w-full bg-transparent border-none outline-none"
                          />
                          <textarea 
                            value={homeContent.collectionsSubtitle.replace(/<br\/>/g, '\n')} 
                            onChange={e => setHomeContent(prev => ({...prev, collectionsSubtitle: e.target.value}))} 
                            onBlur={async (e) => { 
                              const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                              await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { collectionsSubtitle: e.target.value.replace(/\n/g, '<br/>') }, { merge: true }); 
                            }} 
                            className="relative z-50 pointer-events-auto ring-2 ring-pink-500 rounded p-2 bg-pink-50/50 text-neutral-500 font-medium text-center w-full resize-none bg-transparent border-none outline-none overflow-hidden"
                            rows={2}
                          />
                        </div>
                      ) : (
                        <>
                          <h2 
                            className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black"
                            dangerouslySetInnerHTML={{ __html: homeContent.collectionsTitle }}
                          />
                          <p 
                            className="text-neutral-500 font-medium"
                            dangerouslySetInnerHTML={{ __html: homeContent.collectionsSubtitle }}
                          />
                        </>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {ribbonCollections.map((collection: any) => (
                          <div key={collection.tag} className="relative group">
                            <Link href={`/collections/${collection.tag}`} className="relative h-96 rounded-[2rem] overflow-hidden shadow-lg border border-pink-100/50 block transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl z-0">
                              <div className="absolute inset-0 bg-neutral-900 transition duration-700 group-hover:scale-110" style={{ background: `linear-gradient(to bottom right, ${collection.ombreStart || '#f472b6'}, ${collection.ombreEnd || '#000000'})` }}>
                                {(collection.cardImageUrl || collection.backgroundImageUrl) && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div style={{ transform: `scale(${((collection.cardImageUrl ? collection.cardBgScale : collection.bgScale) || 100) / 100})`, width: '100%', height: '100%', position: 'relative' }}>
                                      <Image src={collection.cardImageUrl || collection.backgroundImageUrl} alt={collection.title || "Background"} fill className="object-contain opacity-60 mix-blend-overlay" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                              <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end h-full z-10">
                                <span className="text-pink-300 font-bold text-[10px] tracking-widest uppercase mb-2 drop-shadow-md">Collection</span>
                                <h3 className="text-4xl font-black text-white mb-2 uppercase drop-shadow-lg leading-none" style={{ color: collection.headerColor || '#ffffff' }}>{collection.title}</h3>
                                <p className="text-neutral-300 font-medium line-clamp-2 text-sm">{collection.description || "View this collection ?"}</p>
                              </div>
                            </Link>
                            {editMode && adminUser && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditData({ ...collection }); setShowEditor(true); }}
                                className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-black text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110"
                                title="Edit Collection"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                              </button>
                            )}
                          </div>
                        ))}

                        {editMode && adminUser && (
                          <div 
                            onClick={() => setShowFeaturePicker(true)}
                            className="h-96 rounded-[2rem] border-2 border-dashed border-pink-300 hover:border-pink-500 bg-pink-50/50 hover:bg-pink-100 cursor-pointer flex flex-col items-center justify-center transition-all group shadow-sm hover:shadow-md"
                          >
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4">
                              <span className="text-3xl text-pink-500 font-light">+</span>
                            </div>
                            <span className="font-bold text-pink-500 uppercase tracking-widest text-sm text-center px-4">Add Featured<br/>Collection</span>
                          </div>
                        )}
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
                        {editMode ? (
                          <div className="w-full flex flex-col gap-4">
                            <input 
                              type="text" 
                              value={homeContent.newArrivalsTitle.replace(/<br\/>/g, ' ')} 
                              onChange={e => setHomeContent(prev => ({...prev, newArrivalsTitle: e.target.value}))} 
                              onBlur={async (e) => { 
                                const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                                await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { newArrivalsTitle: e.target.value }, { merge: true }); 
                              }} 
                              className="relative z-50 ring-2 ring-pink-500 rounded p-2 bg-pink-50/50 text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black text-center sm:text-left w-full bg-transparent border-none outline-none"
                            />
                            <textarea 
                              value={homeContent.newArrivalsSubtitle.replace(/<br\/>/g, '\n')} 
                              onChange={e => setHomeContent(prev => ({...prev, newArrivalsSubtitle: e.target.value}))} 
                              onBlur={async (e) => { 
                                const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; 
                                await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { newArrivalsSubtitle: e.target.value.replace(/\n/g, '<br/>') }, { merge: true }); 
                              }} 
                              className="relative z-50 ring-2 ring-pink-500 rounded p-2 bg-pink-50/50 text-neutral-500 font-medium text-center sm:text-left w-full resize-none bg-transparent border-none outline-none overflow-hidden"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            <h2 
                              className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black"
                              dangerouslySetInnerHTML={{ __html: homeContent.newArrivalsTitle }}
                            />
                            <p 
                              className="text-neutral-500 font-medium"
                              dangerouslySetInnerHTML={{ __html: homeContent.newArrivalsSubtitle }}
                            />
                          </>
                        )}
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

        {/* Collection Feature Picker Modal */}
        {showFeaturePicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFeaturePicker(false)} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-black animate-slide-up flex flex-col max-h-[80vh]">
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="font-black text-lg uppercase tracking-wider">Feature Collection</h2>
                <button onClick={() => setShowFeaturePicker(false)} className="text-neutral-400 hover:text-black text-xl font-bold">�</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-neutral-50">
                {allCollections.filter(c => !c.isFeatured).length === 0 ? (
                  <div className="text-center p-8 text-neutral-400 font-medium">All available collections are already featured.</div>
                ) : (
                  <div className="space-y-2">
                    {allCollections.filter(c => !c.isFeatured).map(c => (
                      <button
                        key={c.tag}
                        onClick={async () => {
                          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                          await setDoc(doc(db, 'users', vendorUid, 'collection_settings', c.tag), { isFeatured: true }, { merge: true });
                          const updated = { ...c, isFeatured: true };
                          setRibbonCollections(prev => [...prev, updated] as any);
                          setAllCollections(prev => prev.map(item => item.tag === c.tag ? updated : item));
                          setShowFeaturePicker(false);
                        }}
                        className="w-full text-left p-4 bg-white border rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <h3 className="font-bold text-lg">{c.title || c.tag}</h3>
                          {c.description && <p className="text-xs text-neutral-500 line-clamp-1">{c.description}</p>}
                        </div>
                        <span className="text-pink-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add +</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Collection Inline Theme Editor Modal */}
        {showEditor && editData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-black animate-slide-up flex flex-col max-h-[90vh]">
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10 shrink-0">
                <h2 className="font-black text-lg uppercase tracking-wider">Edit Theme</h2>
                <button onClick={() => setShowEditor(false)} className="text-neutral-400 hover:text-black text-xl font-bold">�</button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* Title and Description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Display Title</label>
                    <input type="text" value={editData.title || ''} onChange={e => setEditData((p: any) => ({ ...p, title: e.target.value }))} className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm focus:border-pink-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Description</label>
                    <textarea value={editData.description || ''} onChange={e => setEditData((p: any) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm focus:border-pink-500 focus:outline-none resize-none" />
                  </div>
                </div>

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
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Collection Page Splashback</label>
                  <div className="border-2 border-dashed rounded-2xl p-4 bg-neutral-50 space-y-3">
                    {editData.backgroundImageUrl && (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden shadow-sm">
                        <Image src={editData.backgroundImageUrl} alt="Splashback" fill className="object-cover" />
                      </div>
                    )}
                    <input type="file" ref={bgFileRef} accept="image/*" className="text-sm w-full font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Scale: {editData.bgScale || 100}%</label>
                      <input type="range" min="10" max="300" value={editData.bgScale || 100} onChange={e => setEditData((p: any) => ({ ...p, bgScale: parseInt(e.target.value) }))} className="w-full accent-pink-500" />
                    </div>
                  </div>
                </div>

                {/* Card Image */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Home Page Card Image</label>
                  <div className="border-2 border-dashed rounded-2xl p-4 bg-neutral-50 space-y-3">
                    {editData.cardImageUrl && (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden shadow-sm">
                        <Image src={editData.cardImageUrl} alt="Card" fill className="object-contain" />
                      </div>
                    )}
                    <input type="file" ref={cardBgFileRef} accept="image/*" className="text-sm w-full font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Scale: {editData.cardBgScale || editData.bgScale || 100}%</label>
                      <input type="range" min="10" max="300" value={editData.cardBgScale || editData.bgScale || 100} onChange={e => setEditData((p: any) => ({ ...p, cardBgScale: parseInt(e.target.value) }))} className="w-full accent-pink-500" />
                    </div>
                  </div>
                </div>
                
                {/* Remove from Featured */}
                <div className="pt-4 border-t border-neutral-100">
                  <button
                    onClick={async () => {
                      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                      await setDoc(doc(db, 'users', vendorUid, 'collection_settings', editData.tag), { isFeatured: false }, { merge: true });
                      setRibbonCollections(prev => prev.filter(c => c.tag !== editData.tag) as any);
                      setAllCollections(prev => prev.map(c => c.tag === editData.tag ? { ...c, isFeatured: false } : c));
                      setShowEditor(false);
                    }}
                    className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm"
                  >
                    Remove from Featured Collections
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="shrink-0 bg-white border-t p-4">
                <button onClick={saveInlineEdits} disabled={savingEdit} className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Slot Picker Modal */}
        {pickerSlotIndex !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickerSlotIndex(null)} />
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden text-black animate-slide-up flex flex-col max-h-[85vh]">
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10 shrink-0">
                <h2 className="font-black text-lg uppercase tracking-wider">Select Design for Slot {pickerSlotIndex + 1}</h2>
                <button onClick={() => setPickerSlotIndex(null)} className="text-neutral-400 hover:text-black text-xl font-bold">�</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-neutral-50 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                      const newIds = [...(homeContent.featuredProductIds || [])];
                      // Fill empty slots up to this index if necessary
                      while(newIds.length <= pickerSlotIndex) { newIds.push(""); }
                      newIds[pickerSlotIndex] = p.id;
                      setHomeContent(prev => ({...prev, featuredProductIds: newIds}));
                      await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { featuredProductIds: newIds }, { merge: true });
                      setPickerSlotIndex(null);
                    }}
                    className="flex flex-col bg-white border rounded-xl overflow-hidden hover:border-pink-500 hover:ring-2 hover:ring-pink-500/30 transition-all text-left shadow-sm group"
                  >
                    <div className="relative aspect-square w-full bg-pink-50">
                      <Image src={p.imagePath} alt={p.name} fill className="object-cover" sizes="150px" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-xs truncate group-hover:text-pink-600 transition-colors">{p.name}</h3>
                      <p className="text-[10px] text-neutral-500">{p.priceOnAsk ? "POA" : `�${p.basePrice}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
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
    </div>
  );
}

