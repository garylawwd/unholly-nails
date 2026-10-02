const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.split('if (window.confirm("Are you sure you want to delete this custom page?")) {').join('confirmModal("Delete Page", "Are you sure you want to delete this custom page?", async () => {');
code = code.split('onClick={async () => {').join('onClick={() => {');
code = code.split('} catch(e: any) {').join('} catch(e: any) {'); // noop
// Now we need to change the closing bracket for the page delete
code = code.replace(/setSelectedTag\(null\);\s*\} catch\(e: any\) \{\s*console\.error\("Delete failed", e\);\s*showModal\("Delete Failed", "Failed to delete page: " \+ \(e\.message \|\| "Unknown error"\)\);\s*\}\s*\}\s*\}\}/, 
'setSelectedTag(null);\n                                  } catch(e: any) {\n                                    console.error("Delete failed", e);\n                                    showModal("Delete Failed", "Failed to delete page: " + (e.message || "Unknown error"));\n                                  }\n                                });\n                              }}');

code = code.split('if (window.confirm("Are you sure you want to permanently delete this item from your inventory?")) {').join('confirmModal("Delete Product", "Are you sure you want to permanently delete this item from your inventory?", async () => {');
code = code.replace(/setSavingProduct\(false\);\s*\}\s*\}\s*\}\} className="px-4 py-2 font-bold text-red-500/, 
'setSavingProduct(false);\n                      }\n                    });\n                  }} className="px-4 py-2 font-bold text-red-500');

fs.writeFileSync('src/app/admin/page.tsx', code);
