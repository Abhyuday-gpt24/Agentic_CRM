"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";

interface ToolInvocationPart {
  type: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
}

interface AiChatboxProps {
  isWidget?: boolean;
  onClose?: () => void; // Useful for the widget close button
}

export default function AiChatbox({
  isWidget = false,
  onClose,
}: AiChatboxProps) {
  const [input, setInput] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const processedTask = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- PREV FUNCTIONALITY: Auto-Prompt Engine ---
  useEffect(() => {
    const task = searchParams.get("task");
    if (task && task !== processedTask.current) {
      processedTask.current = task;
      const promptMap: Record<string, string> = {
        "follow-ups":
          "Fetch all my pending follow-ups for today and display them.",
        quotations:
          "Fetch all clients currently waiting on a formal pricing quotation.",
        emails: "Find all my pending emails and help me draft replies.",
        visits: "Pull up my schedule for pending client visits.",
        opportunities:
          "Show me all active sales opportunities in the pipeline.",
        "win-lost": "Show me the recent won and lost deals from the database.",
      };

      const prompt = promptMap[task];
      if (prompt) {
        sendMessage({ text: prompt });
        router.replace("/", { scroll: false });
      }
    }
  }, [searchParams, sendMessage, router]);

  return (
    <div
      className={`flex flex-col bg-white border border-slate-200 overflow-hidden shadow-xl transition-all
      ${isWidget ? "h-full w-full rounded-none" : "h-full w-full max-w-5xl mx-auto rounded-2xl"}`}
    >
      {/* HEADER */}
      <header
        className={`flex items-center justify-between shrink-0 border-b border-slate-100 
        ${isWidget ? "p-3 bg-slate-900 text-white" : "p-5 bg-white text-slate-800"}`}
      >
        <div>
          <h2
            className={`${isWidget ? "text-sm" : "text-xl"} font-bold tracking-tight`}
          >
            Agentic Assistant
          </h2>
          {!isWidget && (
            <p className="text-xs text-slate-500 font-medium mt-1">
              Standard Text Mode • Ready for instructions
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          {isWidget && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* MESSAGE AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
            <div className={isWidget ? "text-2xl" : "text-5xl"}>💬</div>
            <p className="text-sm font-semibold text-slate-600">
              How can I help?
            </p>
          </div>
        )}

        {messages.map((m: UIMessage) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-4 shadow-sm text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
              }`}
            >
              {m.parts.map((part, index) => {
                // 1. Text Rendering
                if (part.type === "text") {
                  return (
                    <p
                      key={index}
                      className="whitespace-pre-wrap leading-relaxed"
                    >
                      {part.text}
                    </p>
                  );
                }

                // 2. SDK 6 Tool Rendering (Merged from prev widget logic)
                if (part.type.startsWith("tool-")) {
                  const toolName = part.type.replace("tool-", "");
                  const toolPart = part as unknown as ToolInvocationPart;
                  return (
                    <div
                      key={index}
                      className="mt-2 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
                    >
                      <div className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase text-slate-500">
                        Action: {toolName}
                      </div>
                      <div className="p-2 text-[11px]">
                        {toolPart.state === "output-available"
                          ? "✓ Task Complete"
                          : "Querying database..."}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-white border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2 items-center"
        >
          <textarea
            rows={1}
            className="flex-1 p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm resize-none"
            value={input}
            placeholder={isWidget ? "Ask..." : "Message the agent..."}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
