export default function ContactPage() {
  return (
    <div className="min-h-[80vh] bg-[#FFF5F8] text-black">
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-8 text-center">Contact Us</h1>
        
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-pink-100 text-center">
          <p className="text-neutral-500 mb-8 leading-relaxed">
            Have a question about a custom order, sizing, or an existing request? The fastest way to reach us is through Instagram Direct Messages!
          </p>
          
          <a 
            href="https://instagram.com/unhollynails" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gradient-to-tr from-pink-500 to-purple-500 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/30 mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            DM us on Instagram
          </a>
          
          <div className="border-t border-neutral-100 pt-8 mt-4">
            <h3 className="font-bold mb-2">Business Inquiries</h3>
            <p className="text-neutral-500 text-sm">For collaborations or business inquiries, please email:<br/><a href="mailto:unhollynails@gmail.com" className="text-pink-500 font-bold hover:underline">unhollynails@gmail.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
