import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import { updateProduct } from "../../../../actions/product_action";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { organizationId: true, role: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  // 1. UI-Level Security Check
  if (dbUser.role === "EMPLOYEE") {
    redirect("/products"); // Kick them out if they aren't authorized
  }

  // 2. Resolve parameters and fetch the product
  const resolvedParams = await params;

  const product = await prisma.product.findUnique({
    where: {
      id: resolvedParams.id,
      organizationId: dbUser.organizationId, // Tenant boundary check!
    },
  });

  if (!product) {
    redirect("/products"); // Product doesn't exist or isn't in their org
  }

  // 3. Bind the product ID to the Server Action
  const updateAction = updateProduct.bind(null, product.id);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
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
        <h1 className="text-2xl font-bold text-slate-800">
          Edit Product: {product.name}
        </h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={updateAction} className="space-y-8">
          {/* SECTION: Catalog Details */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Catalog Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  defaultValue={product.name}
                  required
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
                  defaultValue={product.price}
                  required
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  defaultValue={product.sku || ""}
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 🚨 Status Toggle Switch */}
              <div className="flex flex-col justify-end">
                <div className="flex items-center bg-[#1E2532] border border-slate-600 rounded-lg p-3 h-[50px]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={product.isActive}
                      className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800 bg-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-300">
                      Product is Active
                    </span>
                  </label>
                </div>
              </div>
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
                defaultValue={product.description || ""}
                className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
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
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition shadow-lg active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
