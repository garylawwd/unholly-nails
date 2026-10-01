import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFF5F8] text-black">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-8 text-center">About Us</h1>
        
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-pink-100 mb-12">
          <div className="w-32 h-32 mx-auto mb-8 relative rounded-full overflow-hidden bg-pink-50 border-4 border-white shadow-lg">
            <Image src="/logo_cropped.png" alt="UnHolly Nails" fill className="object-cover p-2" />
          </div>
          
          <div className="space-y-6 text-neutral-600 leading-relaxed text-lg text-center max-w-2xl mx-auto">
            <p>
              Welcome to the dark and glamorous world of <span className="font-bold text-black">UnHolly Nails</span>.
            </p>
            <p>
              Born from a passion for intricate nail artistry and a love for the bold and unconventional, UnHolly Nails provides luxury, handcrafted press-on nails that look like you just spent three hours at a high-end salon.
            </p>
            <p>
              Every set is meticulously painted, shaped, and reinforced by hand using premium salon-grade gels. We don't do factory mass-production; we do wearable art. Whether you're looking for everyday elegance, gothic spikes, or blinding 3D crystals, we have a set that fits your vibe.
            </p>
            <p className="font-medium text-pink-500 italic mt-8">
              Stay UnHolly,
              <br/>
              The UnHolly Team
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <Link href="/collections/all" className="inline-block bg-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#FF5C9D] transition-colors shadow-lg">
            Shop The Collection
          </Link>
        </div>
      </div>
    </div>
  );
}
