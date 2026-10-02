const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the render condition
  const oldRenderCond = "!selectedProduct.name.toLowerCase().includes('mini') && !selectedProduct.name.toLowerCase().includes('kids')";
  const newRenderCond = "!(selectedProduct.name.toLowerCase().includes('mini') || selectedProduct.name.toLowerCase().includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some(t => t.toLowerCase() === 'minis'))";
  
  content = content.split(oldRenderCond).join(newRenderCond);

  // Fix handleAddToBag condition
  const oldBagCond = "const isMiniSet = name.includes('mini') || name.includes('kids');";
  const newBagCond = "const isMiniSet = name.includes('mini') || name.includes('kids') || selectedProduct.type?.toLowerCase() === 'minis' || (selectedProduct.tags || []).some((t: string) => t.toLowerCase() === 'minis');";
  
  content = content.split(oldBagCond).join(newBagCond);

  fs.writeFileSync(file, content);
}

fixFile('src/app/page.tsx');
fixFile('src/app/collections/[tag]/page.tsx');

