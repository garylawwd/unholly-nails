const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalHeader.tsx', 'utf8');
code = code.split('inRibbon: d.data().inRibbon === true').join('inRibbon: d.data().inRibbon === true').split('          }));').join('          })).filter(c => c.tag !== "--ribbon_layout--");');
fs.writeFileSync('src/components/GlobalHeader.tsx', code);
