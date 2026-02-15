"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!name || !pin) {
      setError("Please enter your name and PIN");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits");
      return;
    }

    // 🔐 Demo PIN auth (local only)
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userName", name);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center text-gray-800">
          Welcome Back
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
          />

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-slate-800"
          />

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg transition"
          >
            Unlock
          </button>
        </form>

        <p className="text-xs text-center text-gray-500">
          This PIN is stored locally on your device
        </p>
      </div>
    </div>
  );
}
