"use client";

import { createOrganization } from "../../../actions/org_setup";

export default function OrgSetup() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Setup your Workspace
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Provide your business details to help the AI tailor your experience.
        </p>
      </div>

      <form action={createOrganization} className="space-y-5">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Company Name
          </label>
          <input
            name="orgName"
            type="text"
            required
            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            placeholder="e.g. Acme Corp"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Industry / Vertical */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Industry
            </label>
            <select
              name="industry"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              <option value="">Select Industry</option>
              <option value="SaaS">SaaS / Software</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Consulting">Consulting</option>
              <option value="Retail">Retail</option>
            </select>
          </div>

          {/* Employee Count */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Team Size
            </label>
            <select
              name="employeeCount"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              <option value="">Select Range</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201+">201+ employees</option>
            </select>
          </div>
        </div>

        {/* Company Website */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Company Website
          </label>
          <input
            name="website"
            type="url"
            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            placeholder="https://example.com"
          />
        </div>

        {/* Physical Address */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Physical Address
          </label>
          <textarea
            name="address"
            rows={2}
            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
            placeholder="123 Business Ave, Suite 100..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
        >
          Create Workspace
        </button>
      </form>
    </div>
  );
}
