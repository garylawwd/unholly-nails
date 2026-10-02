"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut, User, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useCart } from "@/context/CartContext";
import { useAdmin } from "@/context/AdminContext";

export default function GlobalHeader() {
  const pathname = usePathname();
  const [ribbonCollections, setRibbonCollections] = useState<{tag: string, title: string}[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { itemCount, setIsCartOpen } = useCart();
  const { editMode, setEditMode } = useAdmin();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        const q = query(collection(db, "users", vendorUid, "collection_settings"), where("inRibbon", "==", true));
        const snap = await getDocs(q);
        const ribbons = snap.docs.map(d => ({
          tag: d.id,
          title: d.data().title || d.id
        }));
        setRibbonCollections(ribbons as any);
      } catch (e) {
        console.error("Failed to fetch ribbon", e);
      }
    };
    fetchRibbon();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in error", error);
    }
  };

  // Do not render the global header on the admin dashboard route
  if (pathname === '/admin') return null;

  const isActive = (path: string) => pathname === path;
  
  const VALID_ADMINS = ["0TMvGP1VIja7VzVM87MPQaacoY03", "CMzpkonBxKeLboaVTUYwDWgiwNG3"];
  const isAdmin = user?.uid ? VALID_ADMINS.includes(user.uid) : false;

  return (
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
          {/* Hamburger Menu (Mobile Only) */}
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
          
          {/* Brand/Logo on mobile (optional, but good for center spacing if needed, skipped for now to keep utilities right) */}
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
        <div className="hidden md:flex justify-center gap-10 overflow-x-auto hide-scrollbar items-center px-6 pb-3 pt-1 w-full border-t border-pink-50/50">
          <Link href="/" className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive('/') ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
            HOME
          </Link>
          <Link href="/collections/special-offers" className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive('/collections/special-offers') ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
            {ribbonCollections.find((r) => r.tag === 'special-offers')?.title || "SPECIAL OFFERS"}
          </Link>
          
          {['Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].map(coreTag => (
            <Link key={coreTag} href={`/collections/${coreTag}`} className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive(`/collections/${coreTag}`) ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
              {coreTag.toUpperCase()}
            </Link>
          ))}

          {ribbonCollections.filter((rib) => !['special-offers', 'all', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].includes(rib.tag)).map((rib) => (
            <Link key={rib.tag} href={`/collections/${rib.tag}`} className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive(`/collections/${rib.tag}`) ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
              {rib.title}
            </Link>
          ))}
          
          <Link href="/collections/all" className={`text-xs font-bold transition-colors whitespace-nowrap uppercase tracking-[0.2em] ${isActive('/collections/all') ? 'text-[#FF5C9D]' : 'text-neutral-500 hover:text-black'}`}>
            {ribbonCollections.find((r) => r.tag === 'all')?.title || "ALL DESIGNS"}
          </Link>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-pink-100 shadow-xl flex flex-col py-4 px-6 gap-6 z-50">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`text-sm font-bold transition-colors uppercase tracking-widest ${isActive('/') ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
              HOME
            </Link>
            <Link href="/collections/special-offers" onClick={() => setIsMobileMenuOpen(false)} className={`text-sm font-bold transition-colors uppercase tracking-widest ${isActive('/collections/special-offers') ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
              {ribbonCollections.find((r) => r.tag === 'special-offers')?.title || "SPECIAL OFFERS"}
            </Link>

            {['Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].map(coreTag => (
              <Link key={coreTag} href={`/collections/${coreTag}`} onClick={() => setIsMobileMenuOpen(false)} className={`text-sm font-bold transition-colors uppercase tracking-widest ${isActive(`/collections/${coreTag}`) ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
                {coreTag.toUpperCase()}
              </Link>
            ))}

            {ribbonCollections.filter((rib) => !['special-offers', 'all', 'Sets', 'Keychains', 'Earrings', 'Accessories', 'Basics'].includes(rib.tag)).map((rib) => (
              <Link key={rib.tag} href={`/collections/${rib.tag}`} onClick={() => setIsMobileMenuOpen(false)} className={`text-sm font-bold transition-colors uppercase tracking-widest ${isActive(`/collections/${rib.tag}`) ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
                {rib.title}
              </Link>
            ))}
            
            <Link href="/collections/all" onClick={() => setIsMobileMenuOpen(false)} className={`text-sm font-bold transition-colors uppercase tracking-widest ${isActive('/collections/all') ? 'text-[#FF5C9D]' : 'text-neutral-700 hover:text-black'}`}>
              {ribbonCollections.find((r) => r.tag === 'all')?.title || "ALL DESIGNS"}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
