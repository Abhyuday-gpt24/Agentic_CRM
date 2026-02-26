"use client";

import React, { useState } from "react";
import { inviteTeamMember } from "../../../actions/settings_action";

export default function InviteModal({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Wrapper to handle the form submission and close the modal automatically
  const handleInvite = async (formData: FormData) => {
    await inviteTeamMember(formData);
    setIsOpen(false);
  };

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md active:scale-95"
      >
        + Invite Member
      </button>

      {/* MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#242E3D] border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-[#1E2532]/50">
              <h3 className="font-bold text-white text-lg">
                Invite Team Member
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
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
            </div>

            <form action={handleInvite} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {"Colleague's Email Address *"}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="colleague@yourcompany.com"
                  className="w-full p-3 border border-slate-600 rounded-lg bg-[#1E2532] text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  System Role *
                </label>
                <select
                  name="role"
                  required
                  className="w-full p-3 border border-slate-600 rounded-lg bg-[#1E2532] text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="EMPLOYEE">Employee (Standard Access)</option>
                  <option value="MANAGER">Manager (Elevated Access)</option>

                  {/* 🚨 ONLY ADMINS SEE THE ADMIN OPTION */}
                  {currentUserRole === "ADMIN" && (
                    <option value="ADMIN">Admin (Full Control)</option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
