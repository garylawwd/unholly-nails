const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add isFeatured to CollectionMeta interface
code = code.replace(/inRibbon\?: boolean;/g, 'inRibbon?: boolean;\n  isFeatured?: boolean;');

// 2. Add isFeatured default value
code = code.replace(/inRibbon: false,/g, 'inRibbon: false,\n          isFeatured: false,');

// 3. Add isFeatured Checkbox by duplicating inRibbon Checkbox and modifying
code = code.replace(
  /<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website\.<\/span>\s*<\/div>\s*<\/label>/,
  \<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">
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
                          </label>\
);

// 4. Wrap Included Products section
const startSearch = \<div className="mb-6">\n                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>\;
const startReplace = \{!['all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag) && (\\n                        <div className="mb-6">\\n                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>\.replace(/\\\\n/g, '\\n');
code = code.replace(startSearch, startReplace);

const endSearch = \                          </div>\n                        </div>\n\n                        <div className="flex justify-end pt-4">\;
const endReplace = \                          </div>\n                        </div>\n                        )}\n\n                        <div className="flex justify-end pt-4">\;
code = code.replace(endSearch, endReplace);

fs.writeFileSync('src/app/admin/page.tsx', code);
