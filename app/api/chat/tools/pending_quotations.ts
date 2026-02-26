// app/api/chat/tools/pending_quotations.ts
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../../../lib/prisma"; // Import the singleton!

export const pendingQuotationsTool = tool({
  description:
    "Find all clients waiting on a formal pricing quotation. Use this when drafting emails about pricing or proposals.",
  inputSchema: z.object({
    employeeId: z.string(),
  }),
  execute: async ({ employeeId }) => {
    const quotations = await prisma.contact.findMany({
      where: {
        employeeId: employeeId,
        status: "AWAITING_QUOTATION",
      },
      include: { interactions: { take: 1 } },
    });

    return { success: true, count: quotations.length, clients: quotations };
  },
});
