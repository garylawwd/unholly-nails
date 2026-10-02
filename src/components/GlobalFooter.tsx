import Link from "next/link";
import Image from "next/image";

export default function GlobalFooter() {
  return (
    <footer className="bg-white border-t border-pink-100 mt-auto relative z-20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Col */}
          <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <Link href="/" className="inline-block mb-6">
              <Image src="/logo_cropped.png" alt="UnHolly Nails" width={120} height={120} className="drop-shadow-sm" />
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed md:pr-4">
              Luxury custom press-on artistry. Handmade with love and meticulous attention to detail.
            </p>
          </div>

          {/* Shop */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-black uppercase tracking-widest mb-6 text-sm">Shop</h3>
            <ul className="space-y-4">
              <li><Link href="/collections/all" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">All Designs</Link></li>
              <li><Link href="/collections/special-offers" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Special Offers</Link></li>
              <li><Link href="/collections/basics" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Basics</Link></li>
              <li><Link href="/collections/custom" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Custom Orders</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-black uppercase tracking-widest mb-6 text-sm">Information</h3>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">About Us</Link></li>
              <li><Link href="/guides" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Sizing & Application Guide</Link></li>
              <li><Link href="/policies" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Shipping & Returns</Link></li>
              <li><Link href="/contact" className="text-sm text-neutral-500 hover:text-pink-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="font-black text-black uppercase tracking-widest mb-6 text-sm">Connect</h3>
            <ul className="space-y-4 w-full">
              <li>
                <a href="https://instagram.com/unhollynails" target="_blank" rel="noopener noreferrer" className="flex justify-center md:justify-start items-center gap-3 text-sm text-neutral-500 hover:text-pink-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://tiktok.com/@unhollynails" target="_blank" rel="noopener noreferrer" className="flex justify-center md:justify-start items-center gap-3 text-sm text-neutral-500 hover:text-pink-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                  TikTok
                </a>
              </li>
            </ul>
          </div>
          
        </div>

        <div className="border-t border-neutral-100 mt-16 pt-8 flex flex-col justify-center items-center gap-4">
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} UnHolly Nails. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
