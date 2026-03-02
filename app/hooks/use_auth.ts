import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRouting = () => {
    router.push("/");
    router.refresh();
  };

  const loginWithPassword = async (email: string, password: string) => {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    console.log("Full response from NextAuth:", res);
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      handleRouting();
    }
  };

  const loginWithOtp = async (email: string, otp: string) => {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { redirect: false, email, otp });
    if (res?.error) {
      setError("Invalid or expired OTP");
      setLoading(false);
    } else {
      handleRouting();
    }
  };

  const sendOtp = async (email: string) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/send_otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || "Failed to send OTP");
      return false;
    }
    return true;
  };

  const registerWithOtp = async (
    name: string,
    email: string,
    password: string,
    otp: string,
  ) => {
    setLoading(true);
    setError("");

    // 1. Verify OTP
    const verifyRes = await signIn("credentials", {
      redirect: false, // Prevents automatic reload so you can handle errors
      email: email,
      otp: otp,
      password: password,
    });

    if (verifyRes?.error) {
      setError("Invalid or expired OTP");
      setLoading(false);
      return;
    } else {
      console.log("OTP verified successfully for:", email);
      handleRouting();
    }

    // 3. Auto-Login
    await signIn("credentials", { email, password, redirect: false });
    handleRouting();
  };

  const loginWithGoogle = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return {
    loading,
    error,
    setError,
    loginWithPassword,
    loginWithOtp,
    sendOtp,
    registerWithOtp,
    loginWithGoogle,
  };
}
