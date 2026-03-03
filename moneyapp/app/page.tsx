"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = { name: string; emoji: string };

const EMOJIS = ["🟢", "🔵", "🟡", "🟠", "🟣", "🟥", "🟦", "🟨"];

function getUsersFromLocalStorage(): User[] {
  if (typeof window === "undefined") return [];

  const keys = Object.keys(localStorage)
    .filter((k) => k.startsWith("user-"))
    .map((k) => k.replace("user-", ""))
    .sort((a, b) => a.localeCompare(b));

  return keys.map((name, index) => ({
    name,
    emoji: EMOJIS[index % EMOJIS.length],
  }));
}

function saveUser(name: string, pin: string) {
  localStorage.setItem(`user-${name}`, JSON.stringify({ pin }));
}

function getUserPin(name: string): string | null {
  const raw = localStorage.getItem(`user-${name}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.pin === "string" ? parsed.pin : null;
  } catch {
    return null;
  }
}

function deleteUser(name: string) {
  localStorage.removeItem(`user-${name}`);
}

function maskPin(pin: string) {
  return "•".repeat(pin.length);
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
        "border backdrop-blur focus:outline-none focus:ring-4",
        active
          ? "bg-white/95 text-[#0B1B4A] border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-4 ring-white/40"
          : "bg-white/15 text-white border-white/20 hover:bg-white/20 focus:ring-white/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function KeypadButton({
  children,
  onClick,
  ariaLabel,
  variant = "key",
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  variant?: "key" | "danger" | "primary";
}) {
  const base =
    "w-full rounded-2xl text-lg font-semibold transition active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-white/30";
  const styles =
    variant === "primary"
      ? "bg-white text-[#1546D0] hover:bg-white/90 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
      : variant === "danger"
      ? "bg-[#FFD6D6] text-[#8B1220] hover:bg-[#FFC2C2] py-4"
      : "bg-white/12 text-white hover:bg-white/18 py-5";

  return (
    <button
      type="button"
      className={`${base} ${styles}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export default function Page() {
  const router = useRouter();

  // mode
  const [mode, setMode] = useState<"register" | "login">("login");

  // users
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");

  // register
  const [nameInput, setNameInput] = useState("");
  const [registerPin, setRegisterPin] = useState("");

  // login
  const [loginPin, setLoginPin] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);

  // message
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  useEffect(() => {
    setUsers(getUsersFromLocalStorage());
  }, []);

  const hasUsers = users.length > 0;

  const activePin = mode === "register" ? registerPin : loginPin;
  const setActivePin = (next: string) => {
    if (mode === "register") setRegisterPin(next);
    else setLoginPin(next);
  };

  const pinLabel = useMemo(() => {
    if (activePin.length === 0) return "Enter PIN";
    return maskPin(activePin);
  }, [activePin]);

  const pushDigit = (d: string) => {
    setMessage(null);
    if (activePin.length >= 4) return;
    setActivePin(activePin + d);
  };

  const backspace = () => {
    setMessage(null);
    setActivePin(activePin.slice(0, -1));
  };

  const clearPin = () => {
    setMessage(null);
    setActivePin("");
  };

  const refreshUsers = () => {
    const next = getUsersFromLocalStorage();
    setUsers(next);
    if (selectedUser && !next.some((u) => u.name === selectedUser)) {
      setSelectedUser("");
    }
  };

  const handleRegister = () => {
    setMessage(null);

    const name = nameInput.trim();
    if (name.length < 2) {
      setMessage({ type: "err", text: "Name must be at least 2 characters." });
      return;
    }
    if (registerPin.length !== 4) {
      setMessage({ type: "err", text: "PIN must be exactly 4 digits." });
      return;
    }

    const exists = users.some((u) => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setMessage({ type: "err", text: "That name already exists. Try a different one." });
      return;
    }

    saveUser(name, registerPin);
    setMessage({ type: "ok", text: "Account created. You can log in now." });

    setNameInput("");
    setRegisterPin("");
    refreshUsers();

    setMode("login");
    setSelectedUser(name);
    setLoginPin("");
    setShowKeypad(false);
  };

  const handleLogin = () => {
    setMessage(null);

    if (!selectedUser) {
      setMessage({ type: "err", text: "Tap a saved account first." });
      return;
    }
    if (loginPin.length !== 4) {
      setMessage({ type: "err", text: "PIN must be exactly 4 digits." });
      return;
    }

    const savedPin = getUserPin(selectedUser);
    if (!savedPin) {
      setMessage({ type: "err", text: "Account not found. Try again." });
      refreshUsers();
      return;
    }

    if (savedPin !== loginPin) {
      setMessage({ type: "err", text: "Incorrect PIN. Try again." });
      setLoginPin("");
      return;
    }

    localStorage.setItem("userName", selectedUser);
    setMessage({ type: "ok", text: "Logged in. Redirecting..." });
    setTimeout(() => router.push("/main"), 300);
  };

  const handleDeleteSelected = () => {
    if (!selectedUser) return;
    deleteUser(selectedUser);
    setMessage({ type: "ok", text: "Account deleted." });
    setLoginPin("");
    refreshUsers();
  };

  const switchMode = (next: "register" | "login") => {
    setMessage(null);
    setMode(next);
    setShowKeypad(false);
    setActivePin("");
    if (next === "register") {
      setSelectedUser("");
      setLoginPin("");
    } else {
      setRegisterPin("");
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-10 flex items-center justify-center bg-gradient-to-b from-[#5878FF] via-[#335BFF] to-[#102A9A]">
      {/* Square-ish glass card */}
      <div className="w-full max-w-2xl rounded-[2.6rem] bg-white/10 border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {/* Top header area (blue glass) */}
        <div className="px-8 pt-8 pb-6 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight">MoneyApp</h1>
          <p className="mt-2 text-sm text-white/85">Big buttons. Clear steps. Low clutter.</p>

          {/* Mode switch */}
          <div className="mt-6 mx-auto max-w-xl rounded-full bg-white/12 p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={[
                "rounded-full py-3 text-sm font-bold transition",
                mode === "register"
                  ? "bg-white text-[#1546D0] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                  : "text-white/85 hover:text-white",
              ].join(" ")}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "rounded-full py-3 text-sm font-bold transition",
                mode === "login"
                  ? "bg-white text-[#1546D0] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                  : "text-white/85 hover:text-white",
              ].join(" ")}
            >
              Login
            </button>
          </div>
        </div>

        {/* White content panel with BLUE OUTSKIRTS */}
        <div className="px-6 pb-8">
          <div className="rounded-[2.2rem] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)] border-4 border-[#2E5BFF]/30 ring-2 ring-[#2E5BFF]/20 overflow-hidden">
            <div className="p-6 sm:p-7">
              {/* Saved accounts */}
<div className="mb-5">
  <div className="text-sm font-semibold text-slate-900 mb-2">Saved accounts</div>

  {users.length === 0 ? (
    <div className="text-sm text-slate-500">No accounts saved yet.</div>
  ) : (
    <div className="flex flex-wrap gap-3">
      {users.map((u) => {
        const active = selectedUser === u.name;

        return (
          <button
            key={u.name}
            type="button"
            onClick={() => {
              setMessage(null);
              setSelectedUser(u.name);
              setLoginPin("");
            }}
            className={[
              "flex items-center gap-3 rounded-full px-4 py-2",
              "bg-slate-50 hover:bg-slate-100",
              "border border-slate-200",
              "shadow-sm transition",
              "focus:outline-none focus:ring-4 focus:ring-blue-200",
              active ? "border-blue-400 ring-4 ring-blue-200" : "",
            ].join(" ")}
            aria-label={`Select account ${u.name}`}
          >
            <span className="text-2xl leading-none">{u.emoji}</span>

            {/* Force visible text on white background */}
            <span className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
              {u.name}
            </span>
          </button>
        );
      })}
    </div>
  )}
</div>

              {/* Message */}
              {message && (
                <div
                  className={[
                    "mb-6 rounded-2xl px-4 py-3 text-sm font-semibold",
                    message.type === "ok"
                      ? "bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]"
                      : "bg-[#FFF0F0] text-[#8B1220] border border-[#FFB4B4]",
                  ].join(" ")}
                >
                  {message.text}
                </div>
              )}

              {/* REGISTER */}
              {mode === "register" && (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-black/10 bg-[#F7F9FF] p-5">
                    <div className="text-sm font-extrabold text-[#0B1B4A]">Step 1 — Your name</div>
                    <div className="mt-1 text-xs text-[#5B6A91]">
                      Use a short name you’ll recognize easily.
                    </div>

                    <label className="mt-4 block text-xs font-bold text-[#0B1B4A]">Your name</label>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Type your name"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-base outline-none focus:ring-4 focus:ring-[#2E5BFF]/20"
                    />
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-[#F7F9FF] p-5">
                    <div className="text-sm font-extrabold text-[#0B1B4A]">
                      Step 2 — Create a 4-digit PIN
                    </div>
                    <div className="mt-1 text-xs text-[#5B6A91]">
                      Tap the keypad below to create 4 digits.
                    </div>

                    <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-4 text-center text-xl font-extrabold tracking-[0.35em] text-[#0B1B4A]">
                      {pinLabel}
                    </div>
                  </div>
                </div>
              )}

              {/* LOGIN (cleaner: NO “chosen account” box) */}
              {mode === "login" && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
                    <div className="text-center text-xl font-extrabold tracking-[0.35em] text-[#0B1B4A]">
                      {pinLabel}
                    </div>
                    <div className="mt-1 text-center text-xs font-bold text-[#2E5BFF]">
                      Tap to open keypad
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setShowKeypad((v) => !v);
                    }}
                    className="w-full rounded-2xl bg-[#2E5BFF] py-4 text-base font-extrabold text-white shadow-[0_18px_40px_rgba(46,91,255,0.35)] hover:bg-[#234DFF] focus:outline-none focus:ring-4 focus:ring-[#2E5BFF]/25"
                  >
                    {showKeypad ? "Hide keypad" : "Open keypad"}
                  </button>
                </div>
              )}

              {/* Keypad panel (blue block) */}
              {(mode === "register" || showKeypad) && (
                <div className="mt-6 rounded-[1.8rem] bg-gradient-to-b from-[#2E5BFF] to-[#1739C6] p-5 shadow-[0_20px_50px_rgba(23,57,198,0.35)]">
                  <div className="grid grid-cols-3 gap-3">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                      <KeypadButton key={d} onClick={() => pushDigit(d)} ariaLabel={`Digit ${d}`}>
                        {d}
                      </KeypadButton>
                    ))}

                    <KeypadButton onClick={clearPin} ariaLabel="Clear PIN" variant="danger">
                      Clear
                    </KeypadButton>

                    <KeypadButton onClick={() => pushDigit("0")} ariaLabel="Digit 0">
                      0
                    </KeypadButton>

                    <KeypadButton onClick={backspace} ariaLabel="Backspace" variant="danger">
                      ⌫
                    </KeypadButton>
                  </div>

                  <div className="mt-4">
                    {mode === "register" ? (
                      <KeypadButton onClick={handleRegister} variant="primary" ariaLabel="Create account">
                        Create account
                      </KeypadButton>
                    ) : (
                      <KeypadButton onClick={handleLogin} variant="primary" ariaLabel="Login">
                        Login
                      </KeypadButton>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 text-xs text-[#50608A]">
                Colour meaning: <span className="font-bold text-[#2E5BFF]">Blue</span> = primary
                action. <span className="font-bold text-[#B42318]">Red</span> = clear/delete.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom note outside white panel */}
        <div className="pb-8 text-center text-xs text-white/70">
          Designed for accessibility: large targets, clear colour meaning, low clutter.
        </div>
      </div>
    </div>
  );
}