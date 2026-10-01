"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/lib/types";

interface AdminContextType {
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  return (
    <AdminContext.Provider value={{ editMode, setEditMode, editingProduct, setEditingProduct }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
