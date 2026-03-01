import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { deleteProduct } from "../../actions/product_action";
import { Prisma } from "@prisma/client";
import DataFilters, { FilterConfig } from "../components/data_filters";
import Pagination from "../components/pagination";

// ==========================================
// 1. CONSTANTS & QUERY ENGINE
// ==========================================

const PRODUCTS_PER_PAGE = 24;

async function getPaginatedProducts(
  organizationId: string,
  currentPage: number,
  searchParams: {
    q?: string;
    status?: string;
    sort?: string;
  },
) {
  const skipAmount = (currentPage - 1) * PRODUCTS_PER_PAGE;

  // 1. Base Tenant Security
  const whereClause: Prisma.ProductWhereInput = {
    organizationId: organizationId,
  };

  // 2. Text Search (Name or SKU)
  if (searchParams.q) {
    whereClause.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { sku: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  // 3. Status Filter
  if (searchParams.status && searchParams.status !== "ALL") {
    if (searchParams.status === "ACTIVE") whereClause.isActive = true;
    if (searchParams.status === "DRAFT") whereClause.isActive = false;
  }

  // 4. Dynamic Sorting Logic
  let orderByClause: Prisma.ProductOrderByWithRelationInput = {
    createdAt: "desc",
  };

  if (searchParams.sort) {
    switch (searchParams.sort) {
      case "price_desc":
        orderByClause = { price: "desc" };
        break;
      case "price_asc":
        orderByClause = { price: "asc" };
        break;
      case "name_asc":
        orderByClause = { name: "asc" };
        break;
      case "name_desc":
        orderByClause = { name: "desc" };
        break;
      case "newest":
        orderByClause = { createdAt: "desc" };
        break;
    }
  }

  // 5. Execute Queries in Parallel
  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: PRODUCTS_PER_PAGE,
      skip: skipAmount,
    }),
    prisma.product.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  return { products, totalProducts, totalPages };
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { organizationId: true, role: true },
  });

  if (!dbUser || !dbUser.organizationId) redirect("/");

  const canEditProducts = dbUser.role === "ADMIN" || dbUser.role === "MANAGER";

  // Parse current URL parameters
  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || "1", 10);

  // 🚨 Define Filters and Sorts for the Product Catalog
  const productFilters: FilterConfig[] = [
    {
      key: "status",
      label: "Product Status",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Draft / Inactive", value: "DRAFT" },
      ],
    },
  ];

  const productSortOptions = [
    { label: "Price (High to Low)", value: "price_desc" },
    { label: "Price (Low to High)", value: "price_asc" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Recently Added", value: "newest" },
  ];

  // Fetch paginated data
  const { products, totalProducts, totalPages } = await getPaginatedProducts(
    dbUser.organizationId,
    currentPage,
    resolvedParams,
  );

  // Build Pagination URL
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", pageNumber.toString());
    return `/products?${params.toString()}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Product Catalog
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing{" "}
            {products.length > 0
              ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1
              : 0}{" "}
            to {Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)} of{" "}
            {totalProducts} products.
          </p>
        </div>
        {canEditProducts && (
          <Link
            href="/products/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
          >
            + New Product
          </Link>
        )}
      </div>

      {/* 🚨 Search and Filter Bar */}
      <DataFilters
        searchPlaceholder="Search catalog by name or SKU..."
        filters={productFilters}
        sortOptions={productSortOptions}
      />

      {products.length === 0 ? (
        <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-12 text-center text-slate-400 italic">
          {Object.keys(resolvedParams).length > 0
            ? "No products match your current filters."
            : "No products found. Click '+ New Product' to add your first offering."}
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
              <thead className="bg-[#1E2532] text-slate-400 font-semibold uppercase text-xs border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  {canEditProducts && (
                    <th className="px-6 py-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {products.map((product) => {
                  const deleteAction = deleteProduct.bind(null, product.id);

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-800/30 transition group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                          {product.description || "No description provided."}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {product.sku ? (
                          <span className="bg-slate-700/50 px-2 py-1 rounded">
                            {product.sku}
                          </span>
                        ) : (
                          "—"
                        )}
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
                          className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${
                            product.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                          }`}
                        >
                          {product.isActive ? "Active" : "Draft"}
                        </span>
                      </td>

                      {canEditProducts && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/products/${product.id}/edit`}
                              className="text-blue-400 hover:text-blue-300 transition text-xs font-medium"
                            >
                              Edit
                            </Link>
                            <form action={deleteAction}>
                              <button
                                type="submit"
                                className="text-red-400 hover:text-red-300 transition text-xs font-medium"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 🚨 Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildPageUrl={buildPageUrl}
          />
        </>
      )}
    </div>
  );
}
