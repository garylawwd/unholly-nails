"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAdmin } from "@/context/AdminContext";
import { doc, updateDoc, collection, getDocs, query } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const SHAPE_OPTIONS = ["Almond", "Stiletto", "Coffin", "Square", "Oval", "Round"];
const LENGTH_OPTIONS = ["XS", "S", "M", "L", "XL"];

export default function GlobalProductEditor() {
  const { editingProduct, setEditingProduct } = useAdmin();
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setAdminUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (editingProduct && adminUser) {
      // Fetch all unique tags for datalist just once when editor opens
      const fetchTags = async () => {
        const vendorUid = process.env.NEXT_PUBLIC_VENDOR_UID || adminUser.uid;
        const q = query(collection(db, "users", vendorUid, "nail_sets"));
        const snap = await getDocs(q);
        const tags = new Set<string>();
        snap.forEach(doc => {
          const t = doc.data().tags || [];
          t.forEach((tag: string) => tags.add(tag));
        });
        setExistingTags(Array.from(tags));
      };
      fetchTags();
    }
  }, [editingProduct, adminUser]);

  useEffect(() => {
    if (editingProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [editingProduct]);

  if (!editingProduct) return null;

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !editingProduct.tags.includes(newTag)) {
        setEditingProduct({ ...editingProduct, tags: [...(editingProduct.tags || []), newTag] });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditingProduct({
      ...editingProduct,
      tags: editingProduct.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setSaving(true);
    try {
      const pRef = doc(db, editingProduct.docPath);
      let newImagePath = editingProduct.imagePath;
      let newAdditionalImages = [...(editingProduct.additionalImages || [])];
      
      if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
        const files = Array.from(fileInputRef.current.files);
        for (const file of files) {
          const storageReference = ref(storage, `users/${adminUser.uid}/images/storefront_${Date.now()}_${file.name}`);
          await uploadBytes(storageReference, file);
          const url = await getDownloadURL(storageReference);
          
          if (!newImagePath || newImagePath.includes("unsplash")) {
             newImagePath = url;
          } else {
             newAdditionalImages.push(url);
          }
        }
      }

      await updateDoc(pRef, {
        name: editingProduct.name,
        basePrice: Number(editingProduct.basePrice),
        priceOnAsk: editingProduct.priceOnAsk,
        description: editingProduct.description,
        defaultShape: editingProduct.defaultShape,
        defaultLength: editingProduct.defaultLength,
        isPromo: editingProduct.isPromo,
        tags: editingProduct.tags,
        type: editingProduct.type || "Sets",
        imagePath: newImagePath,
        additionalImages: newAdditionalImages
      });

      setEditingProduct(null);
      window.location.reload(); // Quickest way to refresh all stale views
    } catch (error) {
      console.error("Error updating:", error);
      alert("Failed to save. Make sure you have write permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 text-black">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="bg-neutral-100 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <h2 className="font-black text-lg">Edit Product</h2>
          <button onClick={() => setEditingProduct(null)} className="text-neutral-500 hover:text-black font-bold">Close X</button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-5">
          <form id="editForm" onSubmit={handleSaveEdit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Name</label>
                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1 flex justify-between">
                  Price (€)
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] text-pink-600">
                    <input type="checkbox" checked={editingProduct.priceOnAsk} onChange={e => setEditingProduct({...editingProduct, priceOnAsk: e.target.checked})} className="accent-pink-500" />
                    Price on Ask (POA)
                  </label>
                </label>
                <input type="number" step="0.01" disabled={editingProduct.priceOnAsk} value={editingProduct.priceOnAsk ? "" : editingProduct.basePrice} onChange={e => setEditingProduct({...editingProduct, basePrice: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 disabled:bg-neutral-100 disabled:text-neutral-400" required={!editingProduct.priceOnAsk} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Tags / Pins</label>
                <div className="border rounded-xl p-3 bg-white min-h-[3rem] flex flex-wrap gap-2 items-center focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                  {editingProduct.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="w-4 h-4 rounded-full hover:bg-pink-200 flex items-center justify-center text-xs ml-1">×</button>
                    </span>
                  ))}
                  <input type="text" list="existing-tags" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Type or select a tag..." className="flex-1 min-w-[150px] outline-none text-sm bg-transparent" />
                  <datalist id="existing-tags">
                    {existingTags.map(tag => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Product Type</label>
                <select value={editingProduct.type || "Sets"} onChange={e => setEditingProduct({...editingProduct, type: e.target.value})} className="w-full border rounded-xl px-3 py-3 bg-white">
                  <option value="Sets">Sets</option>
                  <option value="Keychains">Keychains</option>
                  <option value="Earrings">Earrings</option>
                  <option value="Accessories">Accessories</option>
                </select>
                <p className="text-[10px] text-neutral-400 mt-2 uppercase tracking-wide">Select the category this product belongs to in the app's Design Catalogue.</p>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input type="checkbox" checked={editingProduct.isPromo} onChange={e => setEditingProduct({...editingProduct, isPromo: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                Show in Special Offers (Promo)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Default Shape</label>
                <select value={editingProduct.defaultShape || ''} onChange={e => setEditingProduct({...editingProduct, defaultShape: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                  {SHAPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Default Length</label>
                <select value={editingProduct.defaultLength || ''} onChange={e => setEditingProduct({...editingProduct, defaultLength: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                  {LENGTH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Description</label>
              <textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 h-24" />
            </div>

            <div className="p-4 border rounded-xl bg-neutral-50">
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Upload Multiple Photos</label>
              <div className="flex items-center gap-4 mb-4">
                <input type="file" ref={fileInputRef} accept="image/*" multiple className="text-sm flex-1 bg-white border p-2 rounded-lg" />
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="relative w-full aspect-square rounded overflow-hidden border-2 border-pink-400">
                  <Image src={editingProduct.imagePath || "https://images.unsplash.com/photo-1596205731518-e37c897f7405?w=500"} alt="main" fill className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">Main</div>
                </div>
                {editingProduct.additionalImages?.map((url, idx) => (
                  <div key={idx} className="relative w-full aspect-square rounded overflow-hidden border group">
                    <Image src={url} alt={`extra-${idx}`} fill className="object-cover" />
                    <button type="button" onClick={() => {
                      const updated = (editingProduct.additionalImages || []).filter((_, i) => i !== idx);
                      setEditingProduct({...editingProduct, additionalImages: updated});
                    }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>
        
        <div className="bg-neutral-50 p-4 border-t flex justify-end gap-3 shrink-0">
          <button onClick={() => setEditingProduct(null)} className="px-5 py-2 font-bold text-neutral-600 hover:text-black">Cancel</button>
          <button form="editForm" type="submit" disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
