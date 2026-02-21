import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    const validOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    // Since this is for the signup flow, we don't delete the OTP yet,
    // we just confirm it's valid so the frontend can proceed to registration.
    return NextResponse.json({ message: "OTP Verified" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
