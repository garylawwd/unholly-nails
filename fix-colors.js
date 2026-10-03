const fs = require('fs');
let code = fs.readFileSync('src/app/collections/[tag]/page.tsx', 'utf8');

// 1. Hide theme button unless edit mode
code = code.replace(/\{adminUser && \(\s*<button\s*onClick=\{openInlineEditor\}/, '{adminUser && editMode && (\n              <button \n                onClick={openInlineEditor}');

// 2. Fix Title color picker placement
code = code.replace(/<div className="absolute -right-2 sm:-right-12 top-1\/2 -translate-y-1\/2 flex items-center justify-center bg-white rounded-full p-1 shadow-lg opacity-100 transition-opacity">/g, 
'<div className="absolute -right-2 sm:-right-14 top-0 sm:top-1/2 sm:-translate-y-1/2 flex items-center justify-center bg-white rounded-full p-2 shadow-xl opacity-100 transition-opacity z-[60]">');
code = code.replace(/className="w-6 h-6 rounded cursor-pointer border-0 p-0"/g, 'className="w-8 h-8 rounded cursor-pointer border-0 p-0"');

fs.writeFileSync('src/app/collections/[tag]/page.tsx', code);
