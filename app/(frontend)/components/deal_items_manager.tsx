"use client";

import React, { useState } from "react";
import { addDealItem, removeDealItem } from "../../actions/deal_item_actions";

// Define the shape of our props
type Product = { id: string; name: string; price: number };
type DealItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export default function DealItemsManager({
  dealId,
  initialItems,
  catalogProducts,
}: {
  dealId: string;
  initialItems: DealItem[];
  catalogProducts: Product[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Calculate the total locally for immediate display
  const grandTotal = initialItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  return (
    <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Line Items</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition font-medium"
        >
          {isAdding ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      {/* ADD ITEM FORM */}
      {isAdding && (
        <form
          action={async (formData) => {
            await addDealItem(dealId, formData);
            setIsAdding(false); // Close form on success
          }}
          className="bg-[#1E2532] p-4 rounded-xl border border-slate-600 mb-6 flex flex-col gap-4 animate-in fade-in"
        >
          <div className="flex items-center gap-4 text-sm text-slate-300 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isCustom}
                onChange={() => setIsCustom(false)}
                className="text-blue-500"
              />
              Catalog Product
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isCustom}
                onChange={() => setIsCustom(true)}
                className="text-blue-500"
              />
              Custom Item
            </label>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {!isCustom ? (
              <select
                name="productId"
                required
                className="flex-1 bg-[#242E3D] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 text-sm"
              >
                <option value="">-- Select a product --</option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price.toLocaleString()})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="text"
                  name="customName"
                  placeholder="Custom Item Name"
                  required
                  className="flex-1 bg-[#242E3D] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  name="customPrice"
                  placeholder="Unit Price"
                  required
                  className="w-32 bg-[#242E3D] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 text-sm"
                />
              </>
            )}

            <input
              type="number"
              name="quantity"
              defaultValue="1"
              min="1"
              required
              className="w-24 bg-[#242E3D] border border-slate-600 text-white rounded-lg p-2.5 outline-none focus:border-blue-500 text-sm"
              placeholder="Qty"
            />

            <button
              type="submit"
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* ITEMS TABLE */}
      {initialItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded-xl">
          No line items attached to this deal yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#1E2532] text-slate-400 font-semibold uppercase text-xs border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {initialItems.map((item) => {
                const removeAction = removeDealItem.bind(null, dealId, item.id);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      ${item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">
                      ${item.totalPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={removeAction}>
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-300 font-medium text-xs"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600 bg-[#1E2532]">
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right font-bold text-slate-300 uppercase text-xs"
                >
                  Deal Total
                </td>
                <td
                  colSpan={2}
                  className="px-4 py-3 text-lg font-bold text-emerald-400 rounded-br-lg"
                >
                  ${grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
