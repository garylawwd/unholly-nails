const fs = require('fs');

const targetPath = 'c:/Users/garyd/unholly-nails/src/app/collections/[tag]/page.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// Replace Hero section
const heroRegex = /<h1[\s\S]*?<\/h1>\s*{(?:collectionInfo\?\.description) && \([\s\S]*?<\/p>\s*\)}/m;

const newHero = \          <div className="relative inline-block group/title">
            {editMode ? (
              <input 
                type="text"
                value={collectionInfo?.title || tag}
                onChange={e => setCollectionInfo((prev: any) => ({...prev, title: e.target.value}))}
                onBlur={async (e) => {
                  if(!adminUser) return;
                  const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                  await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { title: e.target.value }, { merge: true });
                }}
                className={\\\\\\ text-6xl sm:text-8xl drop-shadow-2xl bg-transparent border-none outline-none text-center hover:ring-2 ring-pink-500 rounded p-2\\\} 
                style={{ color: collectionInfo?.headerColor || "#ffffff", minWidth: '300px' }}
              />
            ) : (
              <h1 
                className={\\\\\\ text-6xl sm:text-8xl drop-shadow-2xl\\\} 
                style={{ color: collectionInfo?.headerColor || "#ffffff" }}
              >
                {collectionInfo?.title || tag}
              </h1>
            )}
            {editMode && (
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full p-1 shadow-lg opacity-0 group-hover/title:opacity-100 transition-opacity">
                <input type="color" value={collectionInfo?.headerColor || '#ffffff'} onChange={async (e) => {
                  setCollectionInfo((prev: any) => ({...prev, headerColor: e.target.value}));
                  if(!adminUser) return;
                  const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                  await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { headerColor: e.target.value }, { merge: true });
                }} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Title Color" />
              </div>
            )}
          </div>

          {(collectionInfo?.description || editMode) && (
            <div className="relative inline-block mt-4 w-full max-w-2xl mx-auto group/desc">
              {editMode ? (
                <textarea 
                  value={collectionInfo?.description || ''}
                  onChange={e => setCollectionInfo((prev: any) => ({...prev, description: e.target.value}))}
                  onBlur={async (e) => {
                    if(!adminUser) return;
                    const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                    await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { description: e.target.value }, { merge: true });
                  }}
                  className="text-lg sm:text-xl font-medium drop-shadow-md w-full bg-transparent border-none outline-none text-center hover:ring-2 ring-pink-500 rounded p-2 resize-none overflow-hidden"
                  style={{ color: collectionInfo?.descriptionColor || '#e5e5e5' }}
                  rows={2}
                  placeholder="Collection description..."
                />
              ) : (
                <p 
                  className="text-lg sm:text-xl font-medium drop-shadow-md max-w-2xl mx-auto"
                  style={{ color: collectionInfo?.descriptionColor || '#e5e5e5' }}
                >{collectionInfo.description}</p>
              )}
              {editMode && (
                <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full p-1 shadow-lg opacity-0 group-hover/desc:opacity-100 transition-opacity">
                  <input type="color" value={collectionInfo?.descriptionColor || '#e5e5e5'} onChange={async (e) => {
                    setCollectionInfo((prev: any) => ({...prev, descriptionColor: e.target.value}));
                    if(!adminUser) return;
                    const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || "CMzpkonBxKeLboaVTUYwDWgiwNG3";
                    await setDoc(doc(db, "users", vendorUid, "collection_settings", tag), { descriptionColor: e.target.value }, { merge: true });
                  }} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Description Color" />
                </div>
              )}
            </div>
          )}\;

content = content.replace(heroRegex, newHero);

// Replace "Edit Collection" Sidebar with Modal
// First, find the sidebar block
const sidebarRegex = /{\\\/\\\* Admin Inline Editor Panel \\\*\\\/}[\\s\\S]*?(?={\\\/\\\* Admin Bulk Operations Bar \\\*\\\/})/;

const newSidebar = \{/* Admin Inline Theming Modal */}
      {showEditor && editData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-black">
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-lg">Theme Collection</h2>
              <button onClick={() => setShowEditor(false)} className="text-neutral-400 hover:text-black text-xl font-bold">?</button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Ombre Gradient */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Background Gradient</label>
                <div className="flex items-center gap-3 bg-neutral-50 p-4 rounded-2xl border">
                  <input type="color" value={editData.ombreStart || '#f472b6'} onChange={e => setEditData((p: any) => ({ ...p, ombreStart: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                  <div className="flex-1 h-8 rounded-lg shadow-inner" style={{ background: \\\linear-gradient(to right, \\\, \\\)\\\ }}></div>
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
                    <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm">
                      <Image src={editData.backgroundImageUrl} alt="Current background" fill className="object-cover" />
                    </div>
                  )}
                  <input type="file" ref={bgFileRef} accept="image/*" className="text-sm w-full font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Background Scale: {editData.bgScale || 100}%</label>
                    <input 
                      type="range" min="10" max="300" 
                      value={editData.bgScale || 100}
                      onChange={e => setEditData((p: any) => ({ ...p, bgScale: parseInt(e.target.value) }))}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-neutral-50">
              <button 
                onClick={handleSaveCollection} 
                disabled={savingEdit}
                className="w-full bg-black text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#FF5C9D] transition-colors disabled:opacity-50 shadow-md"
              >
                {savingEdit ? "Saving..." : "Save Theme"}
              </button>
            </div>
          </div>
        </div>
      )}
      \;

content = content.replace(sidebarRegex, newSidebar);
content = content.replace(/title="Edit Collection"/, 'title="Theme Collection"');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully rewritten collections page.');
