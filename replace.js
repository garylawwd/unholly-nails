const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.replace(/if\s*\(window\.confirm\("Are you sure you want to delete this custom page\?"\)\)\s*\{/g, 'confirmModal("Delete Page", "Are you sure you want to delete this custom page?", async () => {');

code = code.replace(/if\s*\(window\.confirm\("Are you sure you want to permanently delete this item from your inventory\?"\)\)\s*\{/g, 'confirmModal("Delete Product", "Are you sure you want to permanently delete this item from your inventory?", async () => {');

fs.writeFileSync('src/app/admin/page.tsx', code);
