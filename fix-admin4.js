const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add isFeatured to CollectionMeta interface
code = code.split('inRibbon?: boolean;').join('inRibbon?: boolean;\n    isFeatured?: boolean;');

// 2. Add isFeatured default value
code = code.split('inRibbon: false,').join('inRibbon: false,\n          isFeatured: false,');

// 3. Add isFeatured Checkbox
const newCb = '<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.isFeatured || false}\n                              onChange={e => setCollectionMetadata(p => ({...p, [selectedTag]: {...(p[selectedTag] || {}), isFeatured: e.target.checked, tag: selectedTag}}))}\n                              className="w-5 h-5 accent-pink-500"\n                            />\n                            <div>\n                              <span className="font-bold block">Show in Featured Collections (Home Page)</span>\n                              <span className="text-xs text-neutral-500">Display this collection as a featured card on the Home Page.</span>\n                            </div>\n                          </label>';
code = code.replace(/<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website\.<\/span>\s*<\/div>\s*<\/label>/, newCb);

// 4. Wrap Included Products section
code = code.replace(/<div className="mb-6">\s*<label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products<\/label>/, '{!["all", "special-offers", "sets", "minis", "keychains", "earrings", "accessories", "basics"].includes(selectedTag) && (\n                        <div className="mb-6">\n                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Included Products</label>');

code = code.replace(/<\/div>\s*<\/div>\s*<div className="flex justify-end pt-4">/, '  </div>\n                        </div>\n                        )}\n\n                        <div className="flex justify-end pt-4">');

fs.writeFileSync('src/app/admin/page.tsx', code);
