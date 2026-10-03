const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// The `)}` is at line 749. Remove it first.
code = code.replace(/<\/label>\s*\)\}\s*<label className="flex items-center gap-3 cursor-pointer p-4 border/g, '</label>\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border');

// Now, correctly wrap the inRibbon checkbox block.
const inRibbonStartSearch = '<div className="pt-4 border-t">\n                        <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                          <input \n                            type="checkbox" \n                            checked={collectionMetadata[selectedTag]?.inRibbon || false}';
const inRibbonStartReplace = '<div className="pt-4 border-t">\n                        {![\'home\', \'all\', \'special-offers\', \'sets\', \'minis\', \'keychains\', \'earrings\', \'accessories\', \'basics\'].includes(selectedTag.toLowerCase()) && (\n                        <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                          <input \n                            type="checkbox" \n                            checked={collectionMetadata[selectedTag]?.inRibbon || false}';

code = code.replace(inRibbonStartSearch, inRibbonStartReplace);

const inRibbonEndSearch = 'Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.isFeatured || false}';
const inRibbonEndReplace = 'Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n                        )}\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\n                            <input \n                              type="checkbox" \n                              checked={collectionMetadata[selectedTag]?.isFeatured || false}';

code = code.replace(inRibbonEndSearch, inRibbonEndReplace);

// Let's also verify that the `Included Products` wrapper was correctly closed.
// We added `)}` for it previously in fix-all.js. Let's make sure it's valid JSX.
// Wait, in fix-all.js:
// code = code.replace(
//  /<\/p>\s*<\/div>\s*<div className="grid grid-cols-2 gap-4">/,
//  '</p>\n                      </div>\n                      )}\n\n                      <div className="grid grid-cols-2 gap-4">'
// );
// Let's check if the opening bracket `{!['all',...].includes(selectedTag) && (` was actually applied.
// Let's run a check.

fs.writeFileSync('src/app/admin/page.tsx', code);
