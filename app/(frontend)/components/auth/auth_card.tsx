"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../../../hooks/use_auth";
import { LoadingSpinner } from "../loading_spinner";

type FlowState = "LOGIN_PASSWORD" | "LOGIN_OTP" | "SIGNUP" | "VERIFY_SIGNUP";

export function AuthCard() {
  const {
    loading,
    error,
    setError,
    loginWithPassword,
    loginWithOtp,
    sendOtp,
    registerWithOtp,
    loginWithGoogle,
  } = useAuth();

  const [flowState, setFlowState] = useState<FlowState>("LOGIN_PASSWORD");

  // Form Data State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  // Orchestrators
  const handleSendOtp = async (nextState: FlowState) => {
    console.log("Attempting to send OTP to:", email);
    if (!email) return setError("Email is required");
    const success = await sendOtp(email);
    if (success) setFlowState(nextState);
  };

  const handleTabSwitch = (isLogin: boolean) => {
    setError("");
    setFlowState(isLogin ? "LOGIN_PASSWORD" : "SIGNUP");
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
      <h1 className="text-2xl font-bold text-center mb-6 text-slate-900">
        Agentic CRM
      </h1>

      {/* Main Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => handleTabSwitch(true)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${flowState.includes("LOGIN") ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
        >
          Login
        </button>
        <button
          onClick={() => handleTabSwitch(false)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${flowState.includes("SIGNUP") ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
        >
          Sign Up
        </button>
      </div>

      <div className="space-y-4">
        {/* SHARED EMAIL INPUT */}
        {(flowState === "LOGIN_PASSWORD" ||
          flowState === "LOGIN_OTP" ||
          flowState === "SIGNUP") && (
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        )}

        {/* --- LOGIN ROUTES --- */}
        {flowState === "LOGIN_PASSWORD" && (
          <>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => loginWithPassword(email, password)}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner />}
              {loading ? "Authenticating..." : "Sign In"}
            </button>
            <button
              onClick={() => setFlowState("LOGIN_OTP")}
              className="w-full text-xs text-blue-600 font-medium"
            >
              Login via Email OTP instead
            </button>
          </>
        )}

        {flowState === "LOGIN_OTP" && (
          <>
            <button
              onClick={() => handleSendOtp("LOGIN_OTP")}
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner />}
              {loading ? "Sending..." : "Send Login Code"}
            </button>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 mt-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => loginWithOtp(email, otp)}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner />}
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              onClick={() => setFlowState("LOGIN_PASSWORD")}
              className="w-full text-xs text-slate-500 font-medium mt-2"
            >
              Back to Password Login
            </button>
          </>
        )}

        {/* --- SIGNUP ROUTES --- */}
        {flowState === "SIGNUP" && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => handleSendOtp("VERIFY_SIGNUP")}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner />}
              {loading ? "Sending OTP..." : "Continue with OTP"}
            </button>
          </>
        )}

        {flowState === "VERIFY_SIGNUP" && (
          <>
            <p className="text-xs text-slate-500 text-center mb-2">
              Code sent to {email}
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => registerWithOtp(name, email, password, otp)}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <LoadingSpinner />}
              {loading ? "Creating Account..." : "Verify & Create Account"}
            </button>
            <button
              onClick={() => setFlowState("SIGNUP")}
              className="w-full text-xs text-slate-500 font-medium mt-2"
            >
              Back to Details
            </button>
          </>
        )}

        {/* Error Display */}
        {error && (
          <p className="text-red-500 text-xs font-bold text-center mt-2">
            {error}
          </p>
        )}
      </div>

      {/* Shared Provider Logins */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100"></div>
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
          <span className="px-4 bg-white text-slate-400">Or Continue With</span>
        </div>
      </div>

      <button
        onClick={loginWithGoogle}
        className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-lg font-bold text-slate-700 text-sm hover:bg-slate-50 transition-all"
      >
        <Image
          src="https://authjs.dev/img/providers/google.svg"
          alt="Google"
          width={18}
          height={18}
        />
        Google
      </button>
    </div>
  );
}
