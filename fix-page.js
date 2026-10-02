const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.replace(/if \(selectedTag !== "new-custom-page"\) \{\s*await deleteDoc\(doc\(db, "users", STORE_OWNER_UID, "collection_settings", selectedTag\)\);\s*\}/, 
'if (selectedTag && selectedTag !== newSlug) { await deleteDoc(doc(db, "users", STORE_OWNER_UID, "collection_settings", selectedTag)); }');

code = code.replace(/\{!\["all", "special-offers", "sets", "minis", "keychains", "earrings", "accessories", "basics", "new-custom-page"\]\.includes\(selectedTag\) && \(/, 
'{!["all", "special-offers", "sets", "minis", "keychains", "earrings", "accessories", "basics"].includes(selectedTag) && (');

fs.writeFileSync('src/app/admin/page.tsx', code);
