import AiChatbox from "./components/ai_chatbox";
import { Suspense } from "react";

export default function FrontendPage() {
  return (
    <div className="h-full w-full bg-slate-50 p-4 lg:p-8">
      {/* Next.js strict requirement for useSearchParams hooks */}
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-slate-500 animate-pulse">
            Initializing Agent...
          </div>
        }
      >
        <AiChatbox />
      </Suspense>
    </div>
  );
}
