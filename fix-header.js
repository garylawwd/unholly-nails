const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalHeader.tsx', 'utf8');

const s1 = "  const hiddenCollections = allCollections.filter(c => !ribbonOrder.includes(c.tag) && !coreTags.map(t=>t.toLowerCase()).includes(c.tag.toLowerCase()));";
const s2 = "  const coreTags = ['home', 'all', 'special-offers', 'Sets', 'Minis', 'Keychains', 'Earrings', 'Accessories', 'Basics'];";

code = code.replace(s1 + '\r\n' + s2, s2 + '\r\n' + s1);
code = code.replace(s1 + '\n' + s2, s2 + '\n' + s1);

fs.writeFileSync('src/components/GlobalHeader.tsx', code);
