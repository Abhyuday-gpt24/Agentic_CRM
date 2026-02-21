// app/api/chat/tools/draft_email.ts
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

export const draftEmailTool = tool({
  description:
    "Draft an email for a client and save it as a pending draft for the user to review.",
  inputSchema: z.object({
    clientId: z.string().describe("The ID of the client to receive the email"),
    userId: z.string().describe("The ID of the employee drafting the email"),
    subject: z.string().describe("The subject line of the email"),
    body: z.string().describe("The full body content of the email"),
    reasoning: z
      .string()
      .describe("Explain to the user why you drafted this specific message"),
  }),
  execute: async ({ clientId, userId, subject, body, reasoning }) => {
    // Save the draft to the database using your refactored schema
    const draft = await prisma.emailDraft.create({
      data: {
        subject,
        body,
        aiReasoning: reasoning,
        clientId,
        userId,
        status: "PENDING_APPROVAL",
      },
    });

    return {
      success: true,
      draftId: draft.id,
      message: "Draft created successfully. Please review it in the chat.",
    };
  },
});
