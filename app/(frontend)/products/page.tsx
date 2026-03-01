import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { deleteProduct } from "../../actions/product_action";

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { organizationId: true, role: true }, // We need the role here!
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const canEditProducts = dbUser.role === "ADMIN" || dbUser.role === "MANAGER";

  // Fetch all products for this specific organization
  const products = await prisma.product.findMany({
    where: { organizationId: dbUser.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Product Catalog
          </h1>
          <p className="text-sm text-slate-600">Manage your products.</p>
        </div>
        {canEditProducts && (
          <Link
            href="/products/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + New Product
          </Link>
        )}
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#1E2532] text-slate-400 font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {
                    "No products found. Click '+ New Product' to add your first offering."
                  }
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const deleteAction = deleteProduct.bind(null, product.id);

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {product.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                      {product.sku || "—"}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">
                      $
                      {product.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${product.isActive ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}
                      >
                        {product.isActive ? "Active" : "Draft"}
                      </span>
                    </td>

                    {canEditProducts && (
                      <td className="px-6 py-4 flex items-center gap-4">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-blue-400 hover:text-blue-300 transition text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <form action={deleteAction}>
                          <button
                            type="submit"
                            className="text-red-400 hover:text-red-300 transition text-sm font-medium"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
