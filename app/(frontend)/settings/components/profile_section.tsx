import React from "react";
import { updateProfile } from "../../../actions/settings_action";

type ProfileProps = {
  email: string | null;
  name: string | null;
};

export default function ProfileSection({ email, name }: ProfileProps) {
  return (
    <section className="bg-[#242E3D] border border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-[#1E2532]/50">
        <h2 className="text-lg font-semibold text-white">Personal Profile</h2>
      </div>
      <div className="p-6">
        <form action={updateProfile} className="max-w-md space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address (Read-only)
            </label>
            <input
              type="email"
              disabled
              defaultValue={email || ""}
              className="w-full p-3 border border-slate-600 rounded-lg bg-[#1E2532] text-slate-500 cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Display Name
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={name || ""}
              className="w-full p-3 border border-slate-600 rounded-lg bg-[#1E2532] text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
              placeholder="e.g. Bruce Wayne"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
          >
            Save Changes
          </button>
        </form>
      </div>
    </section>
  );
}
