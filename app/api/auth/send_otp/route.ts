// app/api/auth/send_otp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email)
      return NextResponse.json({ message: "Email required" }, { status: 400 });

    // 1. Generate a 6-digit code and expiration time
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 2. Save OTP to Prisma
    await prisma.otpCode.create({
      data: { email, otp, expiresAt },
    });

    console.log(
      `Generated OTP for ${email}: ${otp} (expires at ${expiresAt.toISOString()})`,
    );
    /* ##################################################################### REMOVE
    // 3. Configure the local SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 4. Construct and send the email
    const info = await transporter.sendMail({
      from: `"Agentic CRM" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your CRM Login Code",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Agentic CRM Security</h2>
          <p style="color: #475569; font-size: 16px;">Here is your single-use login code. It will expire in 10 minutes.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">If you did not request this login attempt, please ignore this email.</p>
        </div>
      `,
    });
    

    // 5. Log the Ethereal Preview URL to your terminal so you can click it!
    console.log(`\n📧 Email sent: ${info.messageId}`);
    console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}\n`);
    */

    return NextResponse.json(
      { message: "OTP sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("SMTP Error:", error);
    return NextResponse.json(
      { message: "Failed to dispatch email" },
      { status: 500 },
    );
  }
}
