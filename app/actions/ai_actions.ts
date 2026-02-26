"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// --- 1. GENERATE AI DRAFT ---
export async function generateAiDraft(contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) throw new Error("User not found");

  // 🚨 UPDATED: Using 'contact' model and fetching 'companyRecord' relation
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, organizationId: dbUser.organizationId! },
    include: { companyRecord: true },
  });

  if (!contact) throw new Error("Contact not found");

  const { text } = await generateText({
    model: google("gemini-1.5-flash"), // Note: Gemini 2.0 is usually 'gemini-2.0-flash-exp'
    system:
      "You are an expert B2B sales representative writing highly converting, personalized emails. Output ONLY the email body. Do not include subject lines in the output text.",
    prompt: `
      Write a follow-up email to ${contact.name} from ${contact.companyRecord?.name || "their company"}.
      Here are the notes on our relationship: ${contact.relationshipContext || "We are reaching out cold."}
      Keep it under 3 paragraphs, professional but conversational.
    `,
  });

  await prisma.emailDraft.create({
    data: {
      subject: `Following up: ${contact.companyRecord?.name || contact.name}`,
      body: text,
      aiReasoning: `Drafted automatically based on context: ${contact.relationshipContext ? "Has context" : "Cold outreach"}`,
      status: "PENDING_APPROVAL",
      clientId: contact.id, // Keep column name as 'clientId' per schema refactor
      userId: dbUser.id,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
}

// --- 2. APPROVE DRAFT ---
export async function approveDraft(draftId: string, contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const draft = await prisma.emailDraft.update({
    where: { id: draftId },
    data: { status: "APPROVED_AND_SENT" },
  });

  await prisma.interaction.create({
    data: {
      type: "EMAIL_SENT",
      summary: `Sent email: ${draft.subject}`,
      fullContent: draft.body,
      clientId: contactId, // Keep column name as 'clientId' per schema refactor
    },
  });

  // 🚨 UPDATED: Changed prisma.client to prisma.contact
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastContactedAt: new Date() },
  });

  revalidatePath(`/contacts/${contactId}`);
}
