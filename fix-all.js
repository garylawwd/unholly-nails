const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Fix the syntax error from the previous Included Products wrapper
// I need to find the specific closing div sequence and fix it.
// The code currently has:
//                         <p className="text-xs text-neutral-400 mt-2">If no items are selected, this page will automatically pull products tagged with exactly "{selectedTag}". If you select specific items here, it will ONLY pull the selected items.</p>
//                       </div>
//
//                       <div className="grid grid-cols-2 gap-4">

code = code.replace(
  /<\/p>\s*<\/div>\s*<div className="grid grid-cols-2 gap-4">/,
  '</p>\n                      </div>\n                      )}\n\n                      <div className="grid grid-cols-2 gap-4">'
);

// 2. Wrap the inRibbon checkbox so it doesn't show for Core Tags
// First find the inRibbon checkbox string
const inRibbonStart = `<label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.inRibbon || false}`;
const inRibbonReplacement = `{!['home', 'all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag.toLowerCase()) && (\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.inRibbon || false}`;

code = code.replace(inRibbonStart, inRibbonReplacement);

// We need to close it after the inRibbon label, before the isFeatured label.
const inRibbonEnd = `<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.isFeatured || false}`;
const inRibbonEndReplacement = `<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n                          )}\n\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.isFeatured || false}`;

code = code.replace(inRibbonEnd, inRibbonEndReplacement);


// 3. Remove the extra `)}` that I mistakenly added at the very end
code = code.replace(/<\/div>\s*<\/div>\s*\)\}\s*<div className="flex justify-end pt-4">/, '  </div>\n                        </div>\n\n                        <div className="flex justify-end pt-4">');

fs.writeFileSync('src/app/admin/page.tsx', code);
