"use client";

import { useState } from "react";
import AiChatbox from "./ai_chatbox"; // Import the unified component

export default function FloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-80 mb-4 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5">
          {/* We pass isWidget={true} to shrink the UI */}
          <AiChatbox isWidget={true} />
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
