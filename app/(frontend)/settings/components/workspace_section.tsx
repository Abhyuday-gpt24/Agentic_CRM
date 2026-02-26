import React from "react";

export default function WorkspaceSection({
  organizationName,
}: {
  organizationName: string;
}) {
  return (
    <section className="bg-[#242E3D] border border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-[#1E2532]/50">
        <h2 className="text-lg font-semibold text-white">Workspace</h2>
      </div>
      <div className="p-6">
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              disabled
              defaultValue={organizationName}
              className="w-full p-3 border border-slate-600 rounded-lg bg-[#1E2532] text-slate-400 font-medium cursor-not-allowed opacity-70"
            />
            <p className="text-xs text-slate-500 mt-2">
              Only organization admins can change the workspace name.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
