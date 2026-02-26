import React from "react";
import { User } from "@prisma/client";
import InviteModal from "./invite_modal";

type TeamSectionProps = {
  users: User[];
  currentUserId: string;
  currentUserRole: string;
};

export default function TeamSection({
  users,
  currentUserId,
  currentUserRole,
}: TeamSectionProps) {
  return (
    <section className="bg-[#242E3D] border border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-[#1E2532]/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Team Members</h2>

        {/* 🚨 RENDER MODAL BUTTON ONLY FOR ADMINS AND MANAGERS */}
        {(currentUserRole === "ADMIN" || currentUserRole === "MANAGER") && (
          <InviteModal currentUserRole={currentUserRole} />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1E2532]/30 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-[#1E2532] transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                      {user.name?.charAt(0) ||
                        user.email?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                        {user.name || "Pending Invite"}
                        {user.id === currentUserId && " (You)"}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                      user.role === "ADMIN"
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        : user.role === "MANAGER"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {user.name ? (
                    <span className="text-emerald-400">Active</span>
                  ) : (
                    <span className="text-orange-400 italic">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
