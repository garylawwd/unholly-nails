const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add isFeatured to CollectionMeta interface
code = code.replace(/inRibbon\?: boolean;/g, 'inRibbon?: boolean;\n  isFeatured?: boolean;');

// 2. Add isFeatured default value
code = code.replace(/inRibbon: false,/g, 'inRibbon: false,\n          isFeatured: false,');

// 3. Add isFeatured Checkbox
const inRibbonCheckbox = \                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">
                            <input 
                              type="checkbox" 
                              checked={collectionMetadata[selectedTag]?.inRibbon || false}
                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), inRibbon: e.target.checked, tag: selectedTag}}))}
                              className="w-5 h-5 accent-pink-500"
                            />
                            <div>
                              <span className="font-bold block">Show in Storefront Ribbon Menu</span>
                              <span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>
                            </div>
                          </label>\;
const isFeaturedCheckbox = \                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">
                            <input 
                              type="checkbox" 
                              checked={collectionMetadata[selectedTag]?.isFeatured || false}
                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), isFeatured: e.target.checked, tag: selectedTag}}))}
                              className="w-5 h-5 accent-pink-500"
                            />
                            <div>
                              <span className="font-bold block">Show in Featured Collections (Home Page)</span>
                              <span className="text-xs text-neutral-500">Display this collection as a featured card on the Home Page.</span>
                            </div>
                          </label>\;

code = code.replace(inRibbonCheckbox, inRibbonCheckbox + '\n' + isFeaturedCheckbox);

// 4. Wrap Included Products section
// Find where Included Products starts: <div className="mb-6">\n                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>
// Wait, the div starts just before.
const includedProductsStart = \<div className="mb-6">
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>\;
const includedProductsWrapperStart = \{!['all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag) && (
                        <div className="mb-6">
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>\;

code = code.split(includedProductsStart).join(includedProductsWrapperStart);

// We need to close the wrapper. The Included Products div ends right before:
//                         <div className="flex justify-end pt-4">
//                           <button 

const includedProductsEnd = \                          </div>
                        </div>

                        <div className="flex justify-end pt-4">\;
const includedProductsWrapperEnd = \                          </div>
                        </div>
                        )}

                        <div className="flex justify-end pt-4">\;

code = code.split(includedProductsEnd).join(includedProductsWrapperEnd);

fs.writeFileSync('src/app/admin/page.tsx', code);
