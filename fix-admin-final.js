const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Remove the stray `)}`
code = code.replace(/<\/label>\s*\)\}\s*<label className="flex items-center gap-3 cursor-pointer p-4 border/g, '</label>\n                          <label className="flex items-center gap-3 cursor-pointer p-4 border');

// 2. Wrap the first label (Show in Storefront Ribbon Menu) with the condition
// Use a regex to find the start of the <label> that contains "Show in Storefront Ribbon Menu"
// And replace the start of that label.
// But wait, the condition needs to wrap the entire label.
code = code.replace(
  /<label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-neutral-50 transition bg-white relative z-10">\s*<input[^>]+checked=\{collectionMetadata\[selectedTag\]\?\.inRibbon \|\| false\}[^>]+>\s*<div>\s*<span className="font-bold block">Show in Storefront Ribbon Menu<\/span>\s*<span className="text-xs text-neutral-500">Pin this collection to the top navigation ribbon on the main website\.<\/span>\s*<\/div>\s*<\/label>/,
  `{!['home', 'all', 'special-offers', 'sets', 'minis', 'keychains', 'earrings', 'accessories', 'basics'].includes(selectedTag.toLowerCase()) && (
$&
)}`
);

fs.writeFileSync('src/app/admin/page.tsx', code);
