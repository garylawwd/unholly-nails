const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(/where\("inRibbon", "==", true\)/g, 'where("isFeatured", "==", true)');

fs.writeFileSync('src/app/page.tsx', code);
