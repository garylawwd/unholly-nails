"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAdmin } from "@/context/AdminContext";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, setIsCartOpen } = useCart();
  const { editMode, setEditMode } = useAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [allCollections, setAllCollections] = useState<{tag: string, title: string, inRibbon: boolean}[]>([]);
  const [ribbonOrder, setRibbonOrder] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  
  // Modal states
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showConfirmHide, setShowConfirmHide] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchRibbon = async () => {
      try {
        const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
        
        // Fetch all collection settings
        const snap = await getDocs(collection(db, "users", vendorUid, "collection_settings"));
        const collections = snap.docs.map(d => ({
          tag: d.id,
          title: d.data().title || d.id,
          inRibbon: d.data().inRibbon === true
        }));
        setAllCollections(collections);

        // Fetch ribbon layout
        let layoutData = null;
        try {
          const layoutRef = doc(db, "users", vendorUid, "store_settings", "ribbon_layout");
          const layoutSnap = await getDoc(layoutRef);
          if (layoutSnap.exists()) layoutData = layoutSnap.data();
        } catch (err) {
          console.warn("Could not read ribbon_layout (likely Firebase rules), using default order", err);
        }
        
        if (layoutData && layoutData.order && Array.isArray(layoutData.order) && layoutData.order.length > 0) {
          setRibbonOrder(layoutData.order);
        } else {
          // Default fallback that INCLUDES custom pages!
          const defaultCore = ['home', 'special-offers', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'];
          const customInRibbon = collections.filter(c => c.inRibbon && !defaultCore.includes(c.tag)).map(c => c.tag);
          setRibbonOrder([...defaultCore, ...customInRibbon, 'all']);
        }
      } catch (e) {
        console.error("Fatal error fetching ribbon", e);
        setRibbonOrder(['home', 'special-offers', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics', 'all']);
      }
    };
    fetchRibbon();
  }, []);

  const saveRibbonOrder = async (newOrder: string[]) => {
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      await setDoc(doc(db, "users", vendorUid, "store_settings", "ribbon_layout"), { order: newOrder }, { merge: true });
    } catch(e) { console.error("Error saving order", e); }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    setRibbonOrder(prevOrder => {
      const newItems = [...prevOrder];
      const item = newItems[draggedItem];
      if (!item) return prevOrder; // Safety check
      newItems.splice(draggedItem, 1);
      newItems.splice(index, 0, item);
      return newItems;
    });
    setDraggedItem(index);
  };

  const handleDragEnd = async () => {
    const finalItem = draggedItem;
    setDraggedItem(null);
    // saveRibbonOrder requires the latest state. We can use a setTimeout or a dedicated save button.
    // However, since we just updated state, we can't reliably read ribbonOrder here immediately.
    // We'll use a functional state update trick to read it and save it.
    setRibbonOrder(prev => {
      saveRibbonOrder(prev);
      return prev;
    });
  };

  const executeHide = async () => {
    if (!showConfirmHide) return;
    const tagToRemove = showConfirmHide;
    setShowConfirmHide(null);
    
    const newOrder = ribbonOrder.filter(t => t !== tagToRemove);
    setRibbonOrder(newOrder);
    await saveRibbonOrder(newOrder);
    
    if (!['home', 'all', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].includes(tagToRemove)) {
      try {
        const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
        await setDoc(doc(db, "users", vendorUid, "collection_settings", tagToRemove), { inRibbon: false }, { merge: true });
        setAllCollections(prev => prev.map(c => c.tag === tagToRemove ? { ...c, inRibbon: false } : c));
      } catch(err) {}
    }
  };

  const handleAddExistingPage = async (tagToAdd: string) => {
    setShowAddMenu(false);
    if (!ribbonOrder.includes(tagToAdd)) {
      const newOrder = [...ribbonOrder, tagToAdd];
      setRibbonOrder(newOrder);
      await saveRibbonOrder(newOrder);
      if (!['home', 'all', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].includes(tagToAdd)) {
        try {
          const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
          await setDoc(doc(db, "users", vendorUid, "collection_settings", tagToAdd), { inRibbon: true }, { merge: true });
          setAllCollections(prev => prev.map(c => c.tag === tagToAdd ? { ...c, inRibbon: true } : c));
        } catch(err) {}
      }
    }
  };

  const handleCreateNewPage = async () => {
    const title = newCollectionTitle.trim();
    if (!title) {
      setShowCreateModal(false);
      return;
    }
    
    setShowCreateModal(false);
    setNewCollectionTitle("");
    const tag = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!tag) return;
    
    try {
      const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
      await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), {
        tag, title, inRibbon: true
      });
      const newOrder = [...ribbonOrder, tag];
      setRibbonOrder(newOrder);
      await saveRibbonOrder(newOrder);
      setAllCollections(prev => [...prev, { tag, title, inRibbon: true }]);
      router.push(`/collections/${tag}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create page");
    }
  };

  const handleLogout = async () => { await signOut(auth); };
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  if (pathname === '/admin') return null;

  const isActive = (path: string) => pathname === path;
  const VALID_ADMINS = ["0TMvGP1VIja7VzVM87MPQaacoY03", "CMzpkonBxKeLboaVTUYwDWgiwNG3"];
  const isAdmin = user?.uid ? VALID_ADMINS.includes(user.uid) : false;

  const getLinkDetails = (tag: string) => {
    if (tag === 'home') return { title: 'HOME', href: '/' };
    if (tag === 'all') return { title: 'ALL DESIGNS', href: '/collections/all' };
    if (tag === 'special-offers') {
      const custom = allCollections.find(c => c.tag === 'special-offers');
      return { title: custom?.title || 'SPECIAL OFFERS', href: '/collections/special-offers' };
    }
    if (['Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].includes(tag)) {
      return { title: tag.toUpperCase(), href: `/collections/${tag}` };
    }
    const custom = allCollections.find(c => c.tag === tag);
    if (custom) return { title: custom.title.toUpperCase(), href: `/collections/${tag}` };
    return { title: tag.toUpperCase(), href: `/collections/${tag}` };
  };

  const hiddenCollections = allCollections.filter(c => !ribbonOrder.includes(c.tag));
  const coreTags = ['home', 'all', 'special-offers', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'];
  const hiddenCoreTags = coreTags.filter(t => !ribbonOrder.includes(t));

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl shadow-sm border-b border-pink-100/50 w-full">
        {isAdmin && (
          <div className="bg-black text-white text-xs py-1.5 px-4 sm:px-6 flex justify-between items-center w-full">
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="font-bold tracking-widest uppercase hidden sm:inline">Admin Active</span>
              <label className="flex items-center gap-2 cursor-pointer hover:text-pink-300 transition-colors font-bold">
                <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} className="accent-pink-500 w-3.5 h-3.5" />
                Enable Edit Mode
              </label>
              <Link href="/admin" className="text-pink-300 hover:text-white transition-colors underline underline-offset-2">
                Go to Dashboard →
              </Link>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto w-full flex flex-col">
          {/* Top Bar: Utilities & Mobile Menu Toggle */}
          <div className="flex justify-between items-center px-4 sm:px-6 py-2">
            <button 
              className="md:hidden p-2 -ml-2 text-neutral-700 hover:text-[#FF5C9D] transition-colors" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
            
            <div className="hidden md:block flex-1"></div>

            <div className="flex items-center gap-3 ml-auto">
              {!user ? (
                <button onClick={handleSignIn} className="text-[10px] font-bold text-white bg-black hover:bg-neutral-800 px-4 py-2 rounded-full transition whitespace-nowrap">SIGN IN</button>
              ) : (
                <>
                  <Link href="/profile" className={`relative p-2 transition-colors ${isActive('/profile') ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-[#FF5C9D]'}`} aria-label="My Profile">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </Link>
                  <button onClick={handleLogout} className="text-[10px] font-bold text-pink-500 hover:text-pink-700 bg-pink-50 px-3 py-1.5 rounded-full border border-pink-100 transition whitespace-nowrap ml-1">Logout</button>
                </>
              )}
              <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-neutral-700 hover:text-[#FF5C9D] transition-colors ml-1" aria-label="Shopping Bag">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                {itemCount > 0 && <span className="absolute top-0 right-0 bg-[#FF5C9D] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{itemCount}</span>}
              </button>
            </div>
          </div>
          
          {/* Ribbon Navigation (Desktop Only) */}
          <div className="hidden md:flex justify-center gap-6 overflow-x-auto hide-scrollbar items-center px-6 pb-3 pt-1 w-full border-t border-pink-50/50 relative">
            {ribbonOrder.map((tag, index) => {
              const { title, href } = getLinkDetails(tag);
              return (
                <div 
                  key={tag}
                  draggable={editMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1 group ${editMode ? 'cursor-grab active:cursor-grabbing p-1.5 hover:bg-neutral-100 rounded-lg border border-transparent hover:border-neutral-200 transition-all' : ''} ${draggedItem === index ? 'opacity-50' : ''}`}
                >
                  {editMode && (
                    <button onClick={(e) => { e.preventDefault(); setShowConfirmHide(tag); }} className="text-neutral-300 hover:text-red-500 hidden group-hover:block px-1" title="Remove from ribbon">✕</button>
                  )}
                  <Link href={href} className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive(href) ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
                    {title}
                  </Link>
                </div>
              );
            })}
            
            {editMode && (
              <button onClick={() => setShowAddMenu(true)} className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-black text-white rounded-full hover:bg-pink-500 transition-colors text-lg leading-none font-bold ml-2">
                +
              </button>
            )}
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-pink-100 shadow-xl flex flex-col py-2 px-4 gap-2 z-50 max-h-[80vh] overflow-y-auto">
              {ribbonOrder.map((tag, index) => {
                const { title, href } = getLinkDetails(tag);
                return (
                  <div key={tag} className="flex justify-between items-center py-2 px-2 hover:bg-pink-50 rounded-lg">
                    <Link href={href} onClick={() => setIsMobileMenuOpen(false)} className={`flex-1 text-sm font-bold transition-colors uppercase tracking-widest ${isActive(href) ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
                      {title}
                    </Link>
                    {editMode && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (index > 0) {
                              const newOrder = [...ribbonOrder];
                              [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                              setRibbonOrder(newOrder);
                              saveRibbonOrder(newOrder);
                            }
                          }}
                          disabled={index === 0}
                          className="p-2 text-neutral-400 hover:text-black disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (index < ribbonOrder.length - 1) {
                              const newOrder = [...ribbonOrder];
                              [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                              setRibbonOrder(newOrder);
                              saveRibbonOrder(newOrder);
                            }
                          }}
                          disabled={index === ribbonOrder.length - 1}
                          className="p-2 text-neutral-400 hover:text-black disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button onClick={(e) => { e.preventDefault(); setShowConfirmHide(tag); setIsMobileMenuOpen(false); }} className="text-neutral-400 hover:text-red-500 p-2 ml-1" title="Remove from ribbon">✕</button>
                      </div>
                    )}
                  </div>
                )
              })}
              {editMode && (
                <button onClick={() => { setShowAddMenu(true); setIsMobileMenuOpen(false); }} className="mt-2 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  <span>+ Manage Pages</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Global Modals for Ribbon Manager */}
      {/* 1. Add Page Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddMenu(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-slide-up flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-black uppercase tracking-widest text-sm">Add Page to Navigation</h3>
              <button onClick={() => setShowAddMenu(false)} className="text-neutral-400 hover:text-black">✕</button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {[...hiddenCoreTags, ...hiddenCollections.map(c => c.tag)].map(tag => {
                const { title } = getLinkDetails(tag);
                return (
                  <button key={tag} onClick={() => handleAddExistingPage(tag)} className="w-full text-left text-xs font-bold px-4 py-3 hover:bg-pink-50 rounded-xl transition-colors uppercase tracking-widest text-neutral-600 hover:text-black">
                    + {title}
                  </button>
                )
              })}
            </div>
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 sticky bottom-0 z-10">
              <button onClick={() => { setShowAddMenu(false); setShowCreateModal(true); }} className="w-full text-xs font-bold px-4 py-3 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
                <span>✨ Create Brand New Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create New Page Prompt */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-slide-up">
            <div className="p-6">
              <h3 className="font-black uppercase tracking-widest text-lg mb-2">New Collection</h3>
              <p className="text-neutral-500 text-sm mb-6">Enter a title for your new collection page. A URL will be automatically generated.</p>
              <input 
                type="text"
                autoFocus
                value={newCollectionTitle}
                onChange={e => setNewCollectionTitle(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') handleCreateNewPage(); }}
                placeholder="e.g. Summer Vibes"
                className="w-full bg-neutral-100 border-none rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-pink-500 outline-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleCreateNewPage} disabled={!newCollectionTitle.trim()} className="flex-1 py-3 text-sm font-bold text-white bg-[#FF5C9D] hover:bg-pink-600 disabled:opacity-50 disabled:hover:bg-[#FF5C9D] rounded-xl transition-colors">Create Page</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirm Hide Modal */}
      {showConfirmHide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmHide(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✕</div>
              <h3 className="font-black uppercase tracking-widest text-lg mb-2">Hide from Ribbon?</h3>
              <p className="text-neutral-500 text-sm mb-6">Are you sure you want to hide <span className="font-bold text-black">"{getLinkDetails(showConfirmHide).title}"</span> from the main navigation?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmHide(null)} className="flex-1 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={executeHide} className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md shadow-red-500/20">Yes, Hide It</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
