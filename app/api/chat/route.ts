// app/api/chat/route.ts

import { streamText, convertToModelMessages, UIMessage } from "ai";
import { google } from "@ai-sdk/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// 1. Import the bundled tools
import { crmTools } from "./tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are an autonomous CRM assistant... (Employee ID: ${session.user.id})`,

    messages: await convertToModelMessages(messages),

    // 2. Pass the entire bundle to the AI instantly
    tools: crmTools,
  });

  return result.toUIMessageStreamResponse();
}
