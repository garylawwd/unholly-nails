const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalHeader.tsx', 'utf8');

// Replace the filter logic in validTags
const oldValidTagsFilter = `            const validTags = layoutData.order.filter((tag: string) => {
                if (defaultCore.includes(tag)) return true;
                const custom = collections.find(c => c.tag === tag);
                return custom && custom.inRibbon !== false;
              });`;

const newValidTagsFilter = `            const validTags = layoutData.order.filter((tag: string) => {
                const collectionMeta = collections.find(c => c.tag.toLowerCase() === tag.toLowerCase());
                if (defaultCore.includes(tag)) {
                  return !(collectionMeta && collectionMeta.inRibbon === false);
                }
                return collectionMeta && collectionMeta.inRibbon !== false;
              });`;

code = code.replace(oldValidTagsFilter, newValidTagsFilter);

// Replace the else block default fallback
const oldElseBlock = `            // Default fallback that INCLUDES custom pages!
            const defaultCore = ['home', 'special-offers', 'Sets', 'Minis', 'Keychains', 'Earrings', 'Accessories', 'Basics'];
            const customInRibbon = collections.filter(c => c.inRibbon && !defaultCore.includes(c.tag)).map(c => c.tag);
            setRibbonOrder([...defaultCore, ...customInRibbon, 'all']);`;

const newElseBlock = `            // Default fallback that INCLUDES custom pages!
            const defaultCore = ['home', 'special-offers', 'Sets', 'Minis', 'Keychains', 'Earrings', 'Accessories', 'Basics'];
            const filteredCore = [...defaultCore, 'all'].filter(tag => {
              const collectionMeta = collections.find(c => c.tag.toLowerCase() === tag.toLowerCase());
              return !(collectionMeta && collectionMeta.inRibbon === false);
            });
            const customInRibbon = collections.filter(c => c.inRibbon && !defaultCore.includes(c.tag)).map(c => c.tag);
            setRibbonOrder([...filteredCore, ...customInRibbon]);`;

code = code.replace(oldElseBlock, newElseBlock);

fs.writeFileSync('src/components/GlobalHeader.tsx', code);
