import "dotenv/config";
import {
  PrismaClient,
  Role,
  InteractionType,
  DraftStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass the adapter here!
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");
  // ... rest of your seeding logic stays exactly the same

  // 1. Clean the database (Reverse order of dependencies to avoid foreign key errors)
  console.log("🧹 Clearing existing data...");
  await prisma.emailDraft.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Create an Organization
  console.log("🏢 Creating Organization...");
  const org = await prisma.organization.create({
    data: {
      name: "Acme Software Corp",
    },
  });

  // 3. Create Users (One Admin, One Employee)
  console.log("👥 Creating Users...");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@acme.com",
      name: "Alice Admin",
      role: Role.ADMIN,
      organizationId: org.id,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: "bob@acme.com",
      name: "Bob Salesman",
      role: Role.EMPLOYEE,
      organizationId: org.id,
    },
  });

  // 4. Create Clients for Bob
  console.log("🤝 Creating Clients...");

  // Client needing immediate follow-up
  const client1 = await prisma.client.create({
    data: {
      name: "Sarah Connor",
      company: "Cyberdyne Systems",
      email: "sarah@cyberdyne.io",
      status: "ACTIVE",
      employeeId: employeeUser.id,
      organizationId: org.id,
      relationshipContext:
        "Met at SaaStr Annual. High intent, looking to replace their legacy CRM. Keep tone professional but urgent.",
      lastContactedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      nextFollowUpDate: new Date(), // Today!
    },
  });

  // Client in nurturing phase
  const client2 = await prisma.client.create({
    data: {
      name: "Bruce Wayne",
      company: "Wayne Enterprises",
      email: "bruce@wayne.com",
      status: "LEAD",
      employeeId: employeeUser.id,
      organizationId: org.id,
      relationshipContext:
        "Huge budget. Very busy. Prefers short, bulleted emails.",
      lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      nextFollowUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  // 5. Create Historical Interactions (The AI's Memory)
  console.log("📜 Creating Interactions...");
  await prisma.interaction.create({
    data: {
      clientId: client1.id,
      type: InteractionType.MEETING,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      summary:
        "Initial discovery call. Sarah expressed frustration with their current data silos.",
      fullContent:
        "Transcript: [00:00] Bob: Hi Sarah... [05:20] Sarah: We really just need all our data in one place.",
    },
  });

  await prisma.interaction.create({
    data: {
      clientId: client2.id,
      type: InteractionType.EMAIL_SENT,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      summary: "Sent pricing deck as requested.",
      fullContent:
        "Subject: Wayne Enterprises Custom Pricing. Body: Hi Bruce, attached is the deck we discussed.",
    },
  });

  // 6. Create an AI Email Draft (The Generative UI data)
  console.log("🤖 Creating AI Email Drafts...");
  await prisma.emailDraft.create({
    data: {
      clientId: client1.id,
      userId: employeeUser.id,
      subject: "Checking in: Acme CRM + Cyberdyne",
      body: "Hi Sarah,\n\nHope you had a great week. I wanted to float this to the top of your inbox. Have you had a chance to review the data migration timeline we discussed on our call last week?\n\nBest,\nBob",
      aiReasoning:
        "Drafted because nextFollowUpDate is today. Referenced the previous meeting summary regarding data migration.",
      status: DraftStatus.PENDING_APPROVAL,
    },
  });

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
