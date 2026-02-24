"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/", redirect: true })}
      className="block w-full text-left text-sm text-slate-500 hover:text-slate-800 mt-4 transition-colors"
    >
      Log out
    </button>
  );
}
