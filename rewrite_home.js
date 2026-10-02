const fs = require('fs');

const targetPath = 'src/app/page.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// Remove handleEditContent
content = content.replace(/  const handleEditContent = async \([\s\S]*?^  };\n\n/m, '');

// Helper to replace each text block
function replaceField(content, fieldName, isTextarea = false, oldTag = 'h1', extraClasses = '') {
  const regex = new RegExp( *<\\s*\\w+[^>]*onClick=\\{\\(\\)\\s*=>\\s*handleEditContent\\('\\w+',\\s*'[^']+'\\)\\}[^>]*dangerouslySetInnerHTML=\\{\\{ __html:\\s*homeContent\\.\\w+\\s*\\}\\}[^>]*/>, 'g');
  
  const elementStr = isTextarea 
    ? <textarea value={homeContent.\.replace(/<br\\\\/>/g, '\\n')} onChange={e => setHomeContent(prev => ({...prev, \: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { [\\\]: e.target.value.replace(/\\n/g, '<br/>') }, { merge: true }); }} className={\\\\\\ bg-transparent border-none outline-none resize-none text-center w-full overflow-hidden \\\\\\} rows={2} />
    : <input type="text" value={homeContent.\.replace(/<br\\\\/>/g, ' ')} onChange={e => setHomeContent(prev => ({...prev, \: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { [\\\]: e.target.value }, { merge: true }); }} className={\\\\\\ bg-transparent border-none outline-none text-center w-full \\\\\\} />;

  return content.replace(regex, {editMode ? (\) : (<\ className={\\\\\\\\\} dangerouslySetInnerHTML={{ __html: homeContent.\ }} />)});
}

// Just match manually
content = content.replace(/<h1[\s\S]*?onClick=\{\(\) => handleEditContent\('heroTitle', 'Hero Title'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <input type="text" value={homeContent.heroTitle} onChange={e => setHomeContent(prev => ({...prev, heroTitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { heroTitle: e.target.value }, { merge: true }); }} className={\\ bg-transparent border-none outline-none text-center w-full text-4xl sm:text-6xl font-black text-black mb-6 uppercase tracking-tighter leading-none\} />
  ) : (
    <h1 className="text-4xl sm:text-6xl font-black text-black mb-6 uppercase tracking-tighter leading-none" dangerouslySetInnerHTML={{ __html: homeContent.heroTitle }} />
  )}
);

content = content.replace(/<p[\s\S]*?onClick=\{\(\) => handleEditContent\('heroSubtitle', 'Hero Subtitle'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <textarea value={homeContent.heroSubtitle.replace(/<br\\/>/g, '\\n')} onChange={e => setHomeContent(prev => ({...prev, heroSubtitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { heroSubtitle: e.target.value.replace(/\\n/g, '<br/>') }, { merge: true }); }} className={\\ bg-transparent border-none outline-none resize-none text-center w-full max-w-2xl mx-auto overflow-hidden text-lg sm:text-xl text-neutral-500 mb-10 font-medium\} rows={2} />
  ) : (
    <p className="text-lg sm:text-xl text-neutral-500 mb-10 font-medium max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: homeContent.heroSubtitle }} />
  )}
);

content = content.replace(/<h2[\s\S]*?onClick=\{\(\) => handleEditContent\('collectionsTitle', 'Collections Title'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <input type="text" value={homeContent.collectionsTitle} onChange={e => setHomeContent(prev => ({...prev, collectionsTitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { collectionsTitle: e.target.value }, { merge: true }); }} className={\\ bg-transparent border-none outline-none text-center w-full text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black inline-block\} />
  ) : (
    <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black inline-block" dangerouslySetInnerHTML={{ __html: homeContent.collectionsTitle }} />
  )}
);

content = content.replace(/<p[\s\S]*?onClick=\{\(\) => handleEditContent\('collectionsSubtitle', 'Collections Subtitle'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <textarea value={homeContent.collectionsSubtitle.replace(/<br\\/>/g, '\\n')} onChange={e => setHomeContent(prev => ({...prev, collectionsSubtitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { collectionsSubtitle: e.target.value.replace(/\\n/g, '<br/>') }, { merge: true }); }} className={\\ bg-transparent border-none outline-none resize-none text-center w-full mx-auto overflow-hidden text-neutral-500 font-medium inline-block\} rows={2} />
  ) : (
    <p className="text-neutral-500 font-medium inline-block mx-auto w-full" dangerouslySetInnerHTML={{ __html: homeContent.collectionsSubtitle }} />
  )}
);

content = content.replace(/<h2[\s\S]*?onClick=\{\(\) => handleEditContent\('newArrivalsTitle', 'New Arrivals Title'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <input type="text" value={homeContent.newArrivalsTitle} onChange={e => setHomeContent(prev => ({...prev, newArrivalsTitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { newArrivalsTitle: e.target.value }, { merge: true }); }} className={\\ bg-transparent border-none outline-none text-center w-full text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black\} />
  ) : (
    <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 text-black" dangerouslySetInnerHTML={{ __html: homeContent.newArrivalsTitle }} />
  )}
);

content = content.replace(/<p[\s\S]*?onClick=\{\(\) => handleEditContent\('newArrivalsSubtitle', 'New Arrivals Subtitle'\)\}[\s\S]*?\/>/, 
  {editMode ? (
    <textarea value={homeContent.newArrivalsSubtitle.replace(/<br\\/>/g, '\\n')} onChange={e => setHomeContent(prev => ({...prev, newArrivalsSubtitle: e.target.value}))} onBlur={async (e) => { const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3"; await setDoc(doc(db, "users", vendorUid, "store_settings", "home_content"), { newArrivalsSubtitle: e.target.value.replace(/\\n/g, '<br/>') }, { merge: true }); }} className={\\ bg-transparent border-none outline-none resize-none text-center w-full mx-auto overflow-hidden text-neutral-500 font-medium\} rows={2} />
  ) : (
    <p className="text-neutral-500 font-medium w-full" dangerouslySetInnerHTML={{ __html: homeContent.newArrivalsSubtitle }} />
  )}
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully rewritten page.tsx.');
