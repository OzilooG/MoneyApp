"use client";

// FILE: app/page.tsx

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

type SavedUser = { name: string; emoji: string };
type Msg       = { type: "ok" | "err"; text: string };
type RegStep   = "name_pin" | "faceid";

const EMOJIS = ["🟢", "🔵", "🟡", "🟠", "🟣", "🔴", "🟤", "⚪", "🟫", "🩵"];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getStoredUsers(): SavedUser[] {
  if (typeof window === "undefined") return [];
  return Object.keys(localStorage)
    .filter((k) => k.startsWith("user-"))
    .map((k) => k.replace("user-", ""))
    .sort()
    .map((name, i) => ({ name, emoji: EMOJIS[i % EMOJIS.length] }));
}

function saveUser(name: string, pin: string) {
  localStorage.setItem(`user-${name}`, JSON.stringify({ pin }));
}

function getStoredPin(name: string): string | null {
  try {
    const raw = localStorage.getItem(`user-${name}`);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return typeof d?.pin === "string" ? d.pin : null;
  } catch { return null; }
}

function removeUser(name: string) {
  localStorage.removeItem(`user-${name}`);
}

// ─── PIN dots indicator ───────────────────────────────────────────────────────

function PinDots({ pin }: { pin: string }) {
  return (
    <div className="flex justify-center gap-5 py-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
          i < pin.length
            ? "bg-[#2E5BFF] border-[#2E5BFF] scale-110"
            : "bg-transparent border-slate-300"
        }`} />
      ))}
    </div>
  );
}

// ─── Numpad ───────────────────────────────────────────────────────────────────

function Numpad({ onDigit, onBack, onClear, onSubmit, submitLabel }: {
  onDigit:     (d: string) => void;
  onBack:      () => void;
  onClear:     () => void;
  onSubmit?:   () => void;
  submitLabel?: string;
}) {
  return (
    <div className="rounded-[1.8rem] bg-gradient-to-b from-[#2E5BFF] to-[#1739C6] p-5 shadow-[0_20px_50px_rgba(23,57,198,0.35)]">
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button key={d} type="button" onClick={() => onDigit(d)}
            className="w-full rounded-2xl bg-white/12 text-white hover:bg-white/20 font-semibold text-lg py-5 transition active:scale-[0.96]">
            {d}
          </button>
        ))}
        <button type="button" onClick={onClear}
          className="w-full rounded-2xl bg-[#FFD6D6] text-[#8B1220] hover:bg-[#FFC2C2] font-semibold text-base py-4 transition active:scale-[0.96]">
          Clear
        </button>
        <button type="button" onClick={() => onDigit("0")}
          className="w-full rounded-2xl bg-white/12 text-white hover:bg-white/20 font-semibold text-lg py-5 transition active:scale-[0.96]">
          0
        </button>
        <button type="button" onClick={onBack}
          className="w-full rounded-2xl bg-[#FFD6D6] text-[#8B1220] hover:bg-[#FFC2C2] font-semibold text-base py-4 transition active:scale-[0.96]">
          ⌫
        </button>
      </div>

      {onSubmit && (
        <div className="mt-3">
          <button type="button" onClick={onSubmit}
            className="w-full rounded-2xl bg-white text-[#1546D0] font-extrabold text-base py-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:bg-white/90 transition active:scale-[0.98]">
            {submitLabel ?? "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled = false, variant = "blue" }: {
  children: React.ReactNode;
  onClick:  () => void;
  disabled?: boolean;
  variant?:  "blue" | "white";
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`w-full rounded-2xl py-4 text-base font-extrabold transition active:scale-[0.98] focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "blue"
          ? "bg-[#2E5BFF] text-white shadow-[0_18px_40px_rgba(46,91,255,0.35)] hover:bg-[#234DFF] focus:ring-[#2E5BFF]/25"
          : "bg-white text-[#1546D0] shadow-[0_8px_20px_rgba(0,0,0,0.10)] hover:bg-slate-50 focus:ring-[#2E5BFF]/20"
      }`}>
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();

  const [mode, setMode]       = useState<"register" | "login">("register");
  const [users, setUsers]     = useState<SavedUser[]>([]);
  const [msg, setMsg]         = useState<Msg | null>(null);
  const [loading, setLoading] = useState(false);

  // Register
  const [regStep, setRegStep] = useState<RegStep>("name_pin");
  const [regName, setRegName] = useState("");
  const [regPin, setRegPin]   = useState("");

  // Login
  const [selUser, setSelUser]           = useState("");
  const [loginPin, setLoginPin]         = useState("");
  const [showPinEntry, setShowPinEntry] = useState(false);

  useEffect(() => { setUsers(getStoredUsers()); }, []);

  const refreshUsers = () => {
    const next = getStoredUsers();
    setUsers(next);
    if (selUser && !next.some((u) => u.name === selUser)) setSelUser("");
  };

  const switchMode = (next: "register" | "login") => {
    setMode(next); setMsg(null); setRegStep("name_pin");
    setRegName(""); setRegPin(""); setLoginPin(""); setShowPinEntry(false);
    if (next === "register") setSelUser("");
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────────

  const advanceToFaceId = () => {
    setMsg(null);
    const name = regName.trim();
    if (name.length < 2)  { setMsg({ type: "err", text: "Name must be at least 2 characters." }); return; }
    if (regPin.length !== 4) { setMsg({ type: "err", text: "Please enter a 4-digit PIN." }); return; }
    if (users.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      setMsg({ type: "err", text: "That name is already taken." }); return;
    }
    setRegStep("faceid");
  };

  const handleFaceIdSetup = async () => {
    setMsg(null); setLoading(true);
    const name = regName.trim();
    try {
      const optRes  = await fetch("/api/webauthn/register/options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name }),
      });
      const options = await optRes.json().catch(() => ({}));
      if (!optRes.ok) { setMsg({ type: "err", text: options?.error ?? "Could not start Face ID setup." }); return; }

      // v13 REQUIRES { optionsJSON: options }
      const attestationResponse = await startRegistration({ optionsJSON: options });

      const verifyRes  = await fetch("/api/webauthn/register/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name, attestationResponse }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyJson?.verified) {
        setMsg({ type: "err", text: verifyJson?.error ?? "Face ID setup failed." }); return;
      }

      saveUser(name, regPin);
      refreshUsers();
      setMsg({ type: "ok", text: "✅ Account created! Switching to login…" });
      setTimeout(() => { setSelUser(name); switchMode("login"); }, 1000);
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : String(e);
      setMsg({ type: "err", text: text.includes("NotAllowedError") || text.toLowerCase().includes("cancel")
        ? "Face ID was cancelled. Tap the button to try again."
        : text });
    } finally { setLoading(false); }
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────────────

  const handleFaceIdLogin = async () => {
    setMsg(null);
    if (!selUser) { setMsg({ type: "err", text: "Select an account first." }); return; }
    setLoading(true);
    try {
      const optRes  = await fetch("/api/webauthn/auth/options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: selUser }),
      });
      const options = await optRes.json().catch(() => ({}));
      if (!optRes.ok) { setMsg({ type: "err", text: options?.error ?? "Could not start Face ID." }); return; }

      // v13 REQUIRES { optionsJSON: options }
      const assertionResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes  = await fetch("/api/webauthn/auth/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: selUser, assertionResponse }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyJson?.verified) {
        setMsg({ type: "err", text: verifyJson?.error ?? "Face ID failed. Try your PIN." }); return;
      }

      localStorage.setItem("userName", selUser);
      setMsg({ type: "ok", text: "✅ Face ID verified. Redirecting…" });
      setTimeout(() => router.push("/main"), 350);
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : String(e);
      if (text.includes("NotAllowedError") || text.toLowerCase().includes("cancel")) {
        setMsg({ type: "err", text: "Face ID cancelled. Enter your PIN instead." });
        setShowPinEntry(true);
      } else { setMsg({ type: "err", text: text }); }
    } finally { setLoading(false); }
  };

  const handlePinLogin = () => {
    setMsg(null);
    if (!selUser)             { setMsg({ type: "err", text: "Select an account first." }); return; }
    if (loginPin.length !== 4){ setMsg({ type: "err", text: "Enter your 4-digit PIN." }); return; }
    const saved = getStoredPin(selUser);
    if (!saved)               { setMsg({ type: "err", text: "Account not found." }); refreshUsers(); return; }
    if (saved !== loginPin)   { setMsg({ type: "err", text: "Incorrect PIN. Try again." }); setLoginPin(""); return; }
    localStorage.setItem("userName", selUser);
    setMsg({ type: "ok", text: "✅ Logged in. Redirecting…" });
    setTimeout(() => router.push("/main"), 300);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full px-4 py-8 flex items-center justify-center bg-gradient-to-b from-[#5878FF] via-[#335BFF] to-[#102A9A]">
      {/* Wide square-ish glass card — max-w-2xl keeps it wide not tall */}
      <div className="w-full max-w-2xl rounded-[2.6rem] bg-white/10 border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight">MoneyApp</h1>
          <p className="mt-1 text-sm text-white/80">Big buttons. Clear steps. Low clutter.</p>

          <div className="mt-5 rounded-full bg-white/12 p-1 grid grid-cols-2 gap-1 max-w-xs mx-auto">
            {(["register","login"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => switchMode(tab)}
                className={`rounded-full py-3 text-sm font-bold transition capitalize ${
                  mode === tab
                    ? "bg-white text-[#1546D0] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                    : "text-white/80 hover:text-white"
                }`}>
                {tab === "register" ? "Register" : "Login"}
              </button>
            ))}
          </div>
        </div>

        {/* White card */}
        <div className="px-6 pb-8">
          <div className="rounded-[2.2rem] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)] border-4 border-[#2E5BFF]/25 ring-2 ring-[#2E5BFF]/15 overflow-hidden">
            <div className="p-6 sm:p-7 space-y-4">

              {/* Saved accounts */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Saved accounts</p>
                {users.length === 0
                  ? <p className="text-sm text-slate-400">No accounts saved yet.</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {users.map((u) => (
                        <button key={u.name} type="button"
                          onClick={() => { setMsg(null); setSelUser(u.name); setLoginPin(""); setShowPinEntry(false); }}
                          className={`flex items-center gap-2 rounded-full px-3 py-2 border text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-200 ${
                            selUser === u.name
                              ? "border-blue-400 ring-4 ring-blue-200 bg-blue-50 text-blue-800"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                          }`}>
                          <span className="text-xl leading-none">{u.emoji}</span>
                          <span className="max-w-[140px] truncate">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                {mode === "login" && selUser && (
                  <button type="button"
                    onClick={() => { removeUser(selUser); setMsg({ type:"ok", text:"Account deleted." }); refreshUsers(); }}
                    className="mt-2 text-xs font-bold text-[#B42318] hover:underline">
                    Delete selected account
                  </button>
                )}
              </div>

              {/* Banner */}
              {msg && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  msg.type === "ok"
                    ? "bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]"
                    : "bg-[#FFF0F0] text-[#8B1220] border border-[#FFB4B4]"
                }`}>{msg.text}</div>
              )}

              {/* ═══ REGISTER ═══ */}
              {mode === "register" && (
                <>
                  {/* Step tracker */}
                  <div className="flex items-center gap-2">
                    {([["Name & PIN","name_pin"],[" Face ID","faceid"]] as const).map(([label, step], idx) => {
                      const active = regStep === step;
                      const done   = idx === 0 && regStep === "faceid";
                      return (
                        <React.Fragment key={step}>
                          {idx > 0 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            done || active ? "bg-[#2E5BFF] text-white" : "bg-slate-200 text-slate-400"
                          }`}>{done ? "✓" : idx + 1}</div>
                          <span className={`text-xs font-semibold shrink-0 ${active ? "text-[#2E5BFF]" : "text-slate-400"}`}>{label}</span>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Step 1 */}
                  {regStep === "name_pin" && (
                    <div className="space-y-4">
                      {/* Two-column layout on wider card: name field left, PIN dots right */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-[#F7F9FF] p-4">
                          <p className="text-xs font-bold text-slate-600 mb-2">Your name</p>
                          <input value={regName} onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Saint"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-4 focus:ring-[#2E5BFF]/20" />
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-[#F7F9FF] p-4 flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-600 mb-1">4-digit PIN</p>
                          <PinDots pin={regPin} />
                          <p className="text-xs text-center text-slate-400 mt-1">Use keypad below</p>
                        </div>
                      </div>

                      <Numpad
                        onDigit={(d) => { if (regPin.length < 4) setRegPin((p) => p + d); }}
                        onBack={() => setRegPin((p) => p.slice(0,-1))}
                        onClear={() => setRegPin("")}
                        onSubmit={advanceToFaceId}
                        submitLabel="Continue → Set up Face ID"
                      />
                    </div>
                  )}

                  {/* Step 2 */}
                  {regStep === "faceid" && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-100 bg-[#F7F9FF] p-6 text-center space-y-2">
                        <div className="text-5xl">🔐</div>
                        <p className="text-sm font-extrabold text-slate-800">
                          Set up Face ID for <span className="text-[#2E5BFF]">{regName.trim()}</span>
                        </p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                          Creates a secure passkey saved to your device. Log in instantly — no password to remember.
                        </p>
                      </div>
                      <Btn onClick={handleFaceIdSetup} disabled={loading}>
                        {loading ? "Setting up…" : "Set up Face ID / Touch ID"}
                      </Btn>
                      <Btn variant="white" onClick={() => { setRegStep("name_pin"); setMsg(null); }} disabled={loading}>
                        ← Back
                      </Btn>
                    </div>
                  )}
                </>
              )}

              {/* ═══ LOGIN ═══ */}
              {mode === "login" && (
                <div className="space-y-3">
                  {!selUser
                    ? <p className="text-sm text-slate-400 text-center py-4">👆 Select a saved account above.</p>
                    : (
                      <>
                        <Btn onClick={handleFaceIdLogin} disabled={loading}>
                          {loading ? "Checking…" : `Use Face ID  ·  ${selUser}`}
                        </Btn>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-xs text-slate-400 font-semibold">or</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        <Btn variant="white"
                          onClick={() => { setMsg(null); setShowPinEntry((v) => !v); setLoginPin(""); }}>
                          {showPinEntry ? "Hide PIN keypad" : "Enter PIN instead"}
                        </Btn>

                        {showPinEntry && (
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-[#F7F9FF] border border-slate-100 px-4">
                              <PinDots pin={loginPin} />
                            </div>
                            <Numpad
                              onDigit={(d) => { if (loginPin.length < 4) setLoginPin((p) => p + d); }}
                              onBack={() => setLoginPin((p) => p.slice(0,-1))}
                              onClear={() => setLoginPin("")}
                              onSubmit={handlePinLogin}
                              submitLabel="Login with PIN"
                            />
                          </div>
                        )}
                      </>
                    )}
                </div>
              )}

              <p className="text-xs text-slate-400 pt-1">
                <span className="font-bold text-[#2E5BFF]">Blue</span> = primary action.{" "}
                <span className="font-bold text-[#B42318]">Red</span> = clear / delete.
              </p>
            </div>
          </div>
        </div>

        <div className="pb-8 text-center text-xs text-white/60">
          Designed for accessibility: large targets, clear colour meaning, low clutter.
        </div>
      </div>
    </div>
  );
}