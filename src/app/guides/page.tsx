import Link from "next/link";

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-[#FFF5F8] text-black pb-20">
      <div className="bg-pink-100 py-16 mb-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black uppercase tracking-widest mb-4">Sizing & Application</h1>
          <p className="text-pink-800 font-medium">Everything you need to know for a flawless, long-lasting manicure.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-12">
        {/* Sizing Guide */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-wider">How to Measure Your Nails</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
            <div className="space-y-4 text-neutral-600">
              <p>For the most accurate fit, we highly recommend purchasing a <span className="font-bold text-pink-500">Sizing Kit</span> in your desired shape and length before ordering a custom set.</p>
              <p>However, if you'd like to measure at home:</p>
              <ol className="list-decimal pl-5 space-y-2 font-medium text-black">
                <li>Place a piece of clear tape across the widest part of your natural nail.</li>
                <li>Press down the edges and use a fine-tip pen to mark the exact sides of your nail bed.</li>
                <li>Remove the tape and place it flat on a ruler. Measure the distance between the lines in millimeters (mm).</li>
                <li>Repeat for all 10 fingers and record your sizes (Thumb to Pinky).</li>
              </ol>
            </div>
            <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 text-center">
              <h3 className="font-bold mb-4 uppercase tracking-widest text-sm">Standard Sizes (Thumb to Pinky)</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-pink-200 pb-2"><span>XS</span> <span className="font-mono">3, 6, 5, 7, 9</span></li>
                <li className="flex justify-between border-b border-pink-200 pb-2"><span>S</span> <span className="font-mono">2, 5, 4, 6, 9</span></li>
                <li className="flex justify-between border-b border-pink-200 pb-2"><span>M</span> <span className="font-mono">1, 5, 4, 6, 8</span></li>
                <li className="flex justify-between border-b border-pink-200 pb-2"><span>L</span> <span className="font-mono">0, 4, 3, 5, 7</span></li>
              </ul>
              <p className="text-xs text-neutral-500 mt-4">*If your measurements don't match exactly, select "Custom" at checkout and leave your sizes in the order notes!</p>
            </div>
          </div>
          <Link href="/collections/basics" className="inline-block bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-pink-500 transition-colors">Order a Sizing Kit</Link>
        </section>

        {/* Prep & Application */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-wider">Prep & Application</h2>
          <div className="space-y-6 text-neutral-600">
            <div>
              <h3 className="text-lg font-bold text-black mb-2">1. Prep (The most important step!)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Wash your hands with dish soap to remove natural oils.</li>
                <li>Push back your cuticles gently using a wooden pusher.</li>
                <li>Lightly buff the shine off your natural nail using a buffer block.</li>
                <li>Wipe each nail thoroughly with the provided alcohol wipe. Do not touch your nails after this step!</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-black mb-2">2. Apply</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>For Glue (1-3 weeks):</strong> Apply a drop of glue to your natural nail and a small drop to the back of the press-on. Align with your cuticle and press down firmly for 15-20 seconds. Ensure there are no air bubbles!</li>
                <li><strong>For Sticky Tabs (1-3 days):</strong> Select a tab that fits your nail bed. Apply to your natural nail, peel off the plastic film, align the press-on, and press firmly.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Removal */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-pink-100">
          <h2 className="text-2xl font-black mb-4 uppercase tracking-wider">Safe Removal</h2>
          <p className="text-neutral-600 mb-4">Never pull or rip off your press-ons! This will damage your natural nail.</p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Soak your nails in warm, soapy water with a little bit of cuticle oil for 15-20 minutes.</li>
            <li>Gently use a wooden pusher to lift the edges. If they don't pop off easily, soak for another 5 minutes.</li>
            <li>Once removed, lightly buff away any remaining glue and apply cuticle oil to hydrate.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
