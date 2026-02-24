"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { google } from "@ai-sdk/google"; // Make sure you have this installed

// --- 1. GENERATE AI DRAFT ---
export async function generateAiDraft(clientId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) throw new Error("User not found");

  const client = await prisma.client.findUnique({
    where: { id: clientId, organizationId: dbUser.organizationId! },
  });

  if (!client) throw new Error("Client not found");

  // Call the Vercel AI SDK
  const { text, usage } = await generateText({
    model: google("gemini-2.5-flash"), // or whatever model you prefer
    system:
      "You are an expert B2B sales representative writing highly converting, personalized emails. Output ONLY the email body. Do not include subject lines in the output text.",
    prompt: `
      Write a follow-up email to ${client.name} from ${client.company || "their company"}.
      Here are the notes on our relationship: ${client.relationshipContext || "We are reaching out cold."}
      Keep it under 3 paragraphs, professional but conversational.
    `,
  });

  // Save the draft to the database
  await prisma.emailDraft.create({
    data: {
      subject: `Following up: ${client.company || client.name}`,
      body: text,
      aiReasoning: `Drafted automatically based on context: ${client.relationshipContext ? "Has context" : "Cold outreach"}`,
      status: "PENDING_APPROVAL",
      clientId: client.id,
      userId: dbUser.id,
    },
  });

  revalidatePath(`/contacts/${clientId}`);
}

// --- 2. APPROVE DRAFT ---
export async function approveDraft(draftId: string, clientId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  // 1. Mark draft as sent
  const draft = await prisma.emailDraft.update({
    where: { id: draftId },
    data: { status: "APPROVED_AND_SENT" },
  });

  // 2. Log this as an interaction in the timeline
  await prisma.interaction.create({
    data: {
      type: "EMAIL_SENT",
      summary: `Sent email: ${draft.subject}`,
      fullContent: draft.body,
      clientId: clientId,
    },
  });

  // 3. Update the client's Last Contacted date
  await prisma.client.update({
    where: { id: clientId },
    data: { lastContactedAt: new Date() },
  });

  revalidatePath(`/contacts/${clientId}`);
}
