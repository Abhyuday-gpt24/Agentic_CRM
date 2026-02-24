import React from "react";
import Link from "next/link";
import { createProduct } from "../../../actions/product_action";

export default function NewProductPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/products"
          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Add New Product</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={createProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g. Enterprise License"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                id="price"
                name="price"
                required
                placeholder="99.00"
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="sku"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              SKU / Item Code
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              placeholder="e.g. LIC-ENT-001"
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What does this product include?"
              className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href="/products"
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
