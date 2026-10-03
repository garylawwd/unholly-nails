const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Remove the condition wrapping the inRibbon checkbox that I added earlier
const hiddenWrapperStart = `{!['home', 'all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag.toLowerCase()) && (\n                        <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">`;
const hiddenWrapperReplacement = `<label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">`;

code = code.replace(hiddenWrapperStart, hiddenWrapperReplacement);

const hiddenWrapperEnd = `Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n                        )}\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">`;
const hiddenWrapperEndReplacement = `Pin this collection to the top navigation ribbon on the main website.</span>\n                            </div>\n                          </label>\n\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">`;

code = code.replace(hiddenWrapperEnd, hiddenWrapperEndReplacement);

// 2. Change the `checked` logic so it defaults to true for Core tags
const checkedOld = `checked={collectionMetadata[selectedTag]?.inRibbon || false}`;
const checkedNew = `checked={collectionMetadata[selectedTag]?.inRibbon !== undefined ? collectionMetadata[selectedTag].inRibbon : ['home', 'all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag.toLowerCase())}`;

// Only replace the first occurrence (which is the inRibbon one)
code = code.replace(checkedOld, checkedNew);

fs.writeFileSync('src/app/admin/page.tsx', code);
