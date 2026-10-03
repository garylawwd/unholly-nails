const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalHeader.tsx', 'utf8');

const regex1 = /const validTags = layoutData\.order\.filter\(\(tag: string\) => \{\s*if \(defaultCore\.includes\(tag\)\) return true;\s*const custom = collections\.find\(c => c\.tag === tag\);\s*return custom && custom\.inRibbon !== false;\s*\}\);/g;
const replace1 = `const validTags = layoutData.order.filter((tag: string) => {
              const collectionMeta = collections.find(c => c.tag.toLowerCase() === tag.toLowerCase());
              if (defaultCore.includes(tag)) {
                return !(collectionMeta && collectionMeta.inRibbon === false);
              }
              return collectionMeta && collectionMeta.inRibbon !== false;
            });`;

code = code.replace(regex1, replace1);

const regex2 = /const customInRibbon = collections\.filter\(c => c\.inRibbon && !defaultCore\.includes\(c\.tag\)\)\.map\(c => c\.tag\);\s*setRibbonOrder\(\[\.\.\.defaultCore, \.\.\.customInRibbon, 'all'\]\);/g;
const replace2 = `const filteredCore = [...defaultCore, 'all'].filter(tag => {
              const collectionMeta = collections.find(c => c.tag.toLowerCase() === tag.toLowerCase());
              return !(collectionMeta && collectionMeta.inRibbon === false);
            });
            const customInRibbon = collections.filter(c => c.inRibbon && !defaultCore.includes(c.tag)).map(c => c.tag);
            setRibbonOrder([...filteredCore, ...customInRibbon]);`;

code = code.replace(regex2, replace2);

fs.writeFileSync('src/components/GlobalHeader.tsx', code);
