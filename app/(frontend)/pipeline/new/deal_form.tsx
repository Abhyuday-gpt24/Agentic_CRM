"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { createDeal } from "../../../actions/deals_action";
import { Product } from "@prisma/client";

type Contact = {
  id: string;
  name: string;
  companyId: string | null;
};

type Company = {
  id: string;
  name: string;
};

type DealItemState = {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type DealFormProps = {
  contacts: Contact[];
  companies: Company[];
  products: Pick<Product, "id" | "name" | "price">[]; // 🚨 FIXED: Changed pproducts to products
  initialCompanyId?: string;
  initialClientId?: string;
};

export default function DealForm({
  contacts,
  companies,
  products,
  initialCompanyId,
  initialClientId,
}: DealFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialCompanyId || "",
  );

  // Initialize with one empty line item
  const [lineItems, setLineItems] = useState<DealItemState[]>([
    { name: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);

  const filteredContacts = selectedCompanyId
    ? contacts.filter((contact) => contact.companyId === selectedCompanyId)
    : contacts;

  // Real-time Grand Total calculation
  const grandTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [lineItems]);

  const addItem = () => {
    setLineItems([
      ...lineItems,
      { name: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    // Prevent deleting the very last row (a deal needs at least one item)
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<DealItemState>) => {
    const newItems = [...lineItems];
    const updatedItem = { ...newItems[index], ...updates };

    if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
      updatedItem.totalPrice =
        (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0);
    }

    newItems[index] = updatedItem;
    setLineItems(newItems);
  };

  return (
    <form action={createDeal} className="space-y-6">
      {/* 🚨 Hidden Inputs for Server Action Payload */}
      <input type="hidden" name="lineItems" value={JSON.stringify(lineItems)} />
      <input type="hidden" name="amount" value={grandTotal.toString()} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Deal Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g. Q3 Enterprise Expansion"
            className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Calculated Deal Value ($)
          </label>
          <div className="w-full bg-[#1E2532]/50 border border-slate-700 text-emerald-400 font-bold rounded-lg p-3">
            ${grandTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* --- LINE ITEMS SECTION --- */}
      <div className="space-y-4 bg-[#1E2532]/30 p-4 rounded-xl border border-slate-700/50 overflow-x-auto">
        <div className="flex justify-between items-center min-w-[600px]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            Products & Services
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition flex items-center gap-1 shadow-md"
          >
            <span className="text-lg leading-none mb-0.5">+</span> Add Row
          </button>
        </div>

        <div className="space-y-3 min-w-[600px]">
          {lineItems.map((item, index) => (
            <div
              key={index}
              className="flex items-end gap-3 bg-[#1E2532] p-3 rounded-xl border border-slate-700/50 relative group"
            >
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">
                  Catalog Product
                </label>
                <select
                  className="w-full bg-[#242E3D] border border-slate-600 text-sm rounded-lg p-2 text-white"
                  value={item.productId || ""}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod)
                      updateItem(index, {
                        productId: prod.id,
                        name: prod.name,
                        unitPrice: prod.price,
                      });
                    else updateItem(index, { productId: undefined });
                  }}
                >
                  <option value="">Custom Item...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-[1.5]">
                <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consulting Hours"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  className="w-full bg-[#242E3D] border border-slate-600 text-sm rounded-lg p-2 text-white placeholder-slate-600"
                />
              </div>

              <div className="w-20">
                <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">
                  Qty *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={item.quantity === 0 ? "" : item.quantity}
                  onChange={(e) =>
                    updateItem(index, {
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#242E3D] border border-slate-600 text-sm rounded-lg p-2 text-white text-center"
                />
              </div>

              <div className="w-32">
                <label className="text-[10px] text-slate-500 font-bold mb-1 block uppercase tracking-wider">
                  Unit Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                  onChange={(e) =>
                    updateItem(index, {
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#242E3D] border border-slate-600 text-sm rounded-lg p-2 text-white"
                />
              </div>

              <div className="w-28 text-right pr-2">
                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-sm font-bold text-white py-2">
                  ${item.totalPrice.toLocaleString()}
                </p>
              </div>

              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="absolute -right-3 -top-3 bg-red-500/10 text-red-400 p-1.5 rounded-full border border-red-500/20 hover:bg-red-500 hover:text-white transition opacity-0 group-hover:opacity-100 shadow-lg"
                  title="Remove Item"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="companyId"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Associated Company
          </label>
          <select
            id="companyId"
            name="companyId"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Independent / No Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="clientId"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Primary Contact *
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={initialClientId || ""}
            className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={selectedCompanyId !== "" && filteredContacts.length === 0}
          >
            <option value="">Select a contact...</option>
            {filteredContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="stage"
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Initial Pipeline Stage
        </label>
        <select
          id="stage"
          name="stage"
          className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="DISCOVERY">Discovery</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="WON">Closed Won</option>
          <option value="LOST">Closed Lost</option>
        </select>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
        <Link
          href="/pipeline"
          className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
        >
          Create Deal
        </button>
      </div>
    </form>
  );
}
