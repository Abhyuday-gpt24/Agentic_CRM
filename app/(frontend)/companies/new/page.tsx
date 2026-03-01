import React from "react";
import Link from "next/link";
import { createCompany } from "../../../actions/company_action";

export default function NewCompanyPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/companies"
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
        <h1 className="text-2xl font-bold text-slate-800">Add New Account</h1>
      </div>

      <div className="bg-[#242E3D] rounded-2xl shadow-lg border border-slate-700/50 p-6 md:p-8">
        <form action={createCompany} className="space-y-8">
          {/* SECTION 1: Core Identity */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Core Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Wayne Enterprises"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Account Type *
                </label>
                <select
                  id="type"
                  name="type"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PROSPECT">Prospect</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="PARTNER">Partner</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="COMPETITOR">Competitor</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Website URL
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  placeholder="wayne-enterprises.com"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Corporate Phone
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="+1 (800) 555-0000"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Firmographics */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Firmographics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Industry...</option>
                  <option value="Software / Technology">
                    Software / Technology
                  </option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail / E-Commerce">
                    Retail / E-Commerce
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="employeeCount"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Company Size
                </label>
                <select
                  id="employeeCount"
                  name="employeeCount"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Size...</option>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-1000">201-1000 Employees</option>
                  <option value="1000+">1000+ Employees</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="annualRevenue"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Annual Revenue ($)
                </label>
                <input
                  type="number"
                  id="annualRevenue"
                  name="annualRevenue"
                  step="0.01"
                  placeholder="10000000"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="tickerSymbol"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  id="tickerSymbol"
                  name="tickerSymbol"
                  placeholder="AAPL"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Billing Address */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">
              Billing Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="billingStreet"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Street Address
                </label>
                <input
                  type="text"
                  id="billingStreet"
                  name="billingStreet"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="billingCity"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  City
                </label>
                <input
                  type="text"
                  id="billingCity"
                  name="billingCity"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="billingState"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  State / Province
                </label>
                <input
                  type="text"
                  id="billingState"
                  name="billingState"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="billingZip"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Zip / Postal Code
                </label>
                <input
                  type="text"
                  id="billingZip"
                  name="billingZip"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="billingCountry"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Country
                </label>
                <input
                  type="text"
                  id="billingCountry"
                  name="billingCountry"
                  className="w-full bg-[#1E2532] border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50">
            <Link
              href="/companies"
              className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg active:scale-95"
            >
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
