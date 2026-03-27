"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getUserData, type UserData } from "@/lib/moneyData";
import { fetchFromMongo, saveAndSync } from "@/lib/financeSync";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };
const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } } };

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

const NAV = [
  { icon: "⌂", label: "Home",     active: false, href: "/main"    },
  { icon: "◈", label: "Spending", active: false, href: "/spent"   },
  { icon: "◉", label: "Savings",  active: true,  href: "/savings" },
];

export default function SavingsPage() {
  const router = useRouter();

  const [userName, setUserName]   = useState("");
  const [savings, setSavings]     = useState(0);
  const [goal, setGoal]           = useState(0);
  const [goalDraft, setGoalDraft] = useState(0);
  const [fullData, setFullData]   = useState<UserData | null>(null);

  useEffect(() => {
    const name   = localStorage.getItem("userName") || "";
    const userId = localStorage.getItem("userId")   || "";
    if (!name) { window.location.href = "/"; return; }
    setUserName(name);

    async function load() {
      if (userId) await fetchFromMongo(name, userId);
      const data = getUserData(name);
      setFullData(data);
      setSavings(data.savings);
      setGoal(data.savingsGoal);
      setGoalDraft(data.savingsGoal);
    }
    load();
  }, []);

  function save(newSavings: number, newGoal = goal) {
    if (!userName || !fullData) return;
    const updated: UserData = { ...fullData, savings: newSavings, savingsGoal: newGoal };
    setFullData(updated);
    saveAndSync(userName, updated);
  }

  function addToSavings(amount: number) {
    const newSavings = savings + amount;
    setSavings(newSavings);
    save(newSavings);
    speak(`${amount} euro added to savings`);
  }

  function confirmGoal() {
    setGoal(goalDraft);
    save(savings, goalDraft);
    speak(`Savings goal set to ${goalDraft} euro`);
  }

  const pct       = goal > 0 ? Math.min(Math.round((savings / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - savings, 0);
  const angle     = goal > 0 ? (Math.min(savings, goal) / goal) * 360 : 0;
  const arcPath   = angle >= 360
    ? "M110 10 A100 100 0 1 1 109.99 10 Z"
    : angle === 0 ? ""
    : `M110 110 L110 10 A100 100 0 ${angle > 180 ? 1 : 0} 1 ${110 + 100 * Math.sin((Math.PI * angle) / 180)} ${110 - 100 * Math.cos((Math.PI * angle) / 180)} Z`;

  return (
    <div className="min-h-screen w-full pb-28"
      style={{ background: "linear-gradient(135deg, #5878FF 0%, #335BFF 50%, #102A9A 100%)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 max-w-7xl mx-auto">
        <div>
          <p className="text-white/55 text-sm font-medium">My Money</p>
          <h1 className="text-white text-2xl font-extrabold mt-0.5">Savings 💎</h1>
        </div>
        <button onClick={() => router.push("/main")}
          className="px-4 py-2 rounded-2xl font-semibold text-sm text-white"
          style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.3)" }}>
          ⌂ Home
        </button>
      </div>

      <div className="px-4 max-w-7xl mx-auto flex flex-col gap-4">

        {/* ── Row 1: Savings total — full width ── */}
        <motion.div initial="hidden" animate="show" variants={fadeUp}
          className="rounded-[2.2rem] bg-white p-7 shadow-2xl shadow-black/20"
          style={{ border: "1px solid rgba(255,255,255,0.8)" }}>

          {/* On iPad: 3-column layout inside this card */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-8">

            {/* Left: big number + TTS */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-slate-400 text-sm font-medium">Money saved</p>
              <p className="text-5xl font-black mt-1 tracking-tight" style={{ color: "#16a34a" }}>
                €{savings.toFixed(2)}
              </p>
              <div className="flex justify-center md:justify-start mt-3">
                <button onClick={() => speak(`You have saved ${savings.toFixed(2)} euro`)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0" }}>
                  🔈 Hear my savings
                </button>
              </div>
            </div>

            {/* Right: progress bar — shown inline on iPad when goal is set */}
            {goal > 0 && (
              <div className="flex-1 mt-5 md:mt-0">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">Progress to goal</span>
                  <span style={{ color: "#16a34a" }}>{pct}%</span>
                </div>
                <div className="w-full h-4 bg-green-50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #4ade80, #16a34a)" }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>€{savings.toLocaleString()} saved</span>
                  <span>€{remaining.toLocaleString()} to go</span>
                </div>

                {/* Saved / Remaining chips */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#f0fdf4" }}>
                    <p className="text-[11px] text-green-600 font-semibold">Saved</p>
                    <p className="text-xl font-extrabold text-green-700">€{savings.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#f0fdf4" }}>
                    <p className="text-[11px] text-green-600 font-semibold">Goal</p>
                    <p className="text-xl font-extrabold text-green-700">€{goal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Row 2: Pie chart + Set goal side by side on iPad ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Pie chart — only when goal is set */}
          {goal > 0 ? (
            <motion.div initial="hidden" animate="show" variants={fadeIn}
              className="rounded-[2.2rem] bg-white p-7 shadow-xl shadow-black/10 text-center flex flex-col items-center justify-center">
              <p className="font-extrabold text-slate-800 text-base mb-4">🥧 Savings progress</p>
              <svg width="180" height="180" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="100" fill="#f0fdf4" />
                {arcPath && <path d={arcPath} fill="#16a34a" />}
                <circle cx="110" cy="110" r="60" fill="white" />
                <text x="110" y="106" textAnchor="middle"
                  style={{ fontSize: "22px", fontWeight: 900, fill: "#16a34a" }}>{pct}%</text>
                <text x="110" y="128" textAnchor="middle"
                  style={{ fontSize: "11px", fill: "#94a3b8" }}>complete</text>
              </svg>
            </motion.div>
          ) : (
            /* Placeholder card when no goal is set yet so grid stays balanced */
            <motion.div initial="hidden" animate="show" variants={fadeIn}
              className="rounded-[2.2rem] bg-white/10 p-7 shadow-xl shadow-black/10 flex flex-col items-center justify-center gap-2 border border-white/20">
              <span className="text-5xl">🎯</span>
              <p className="text-white/70 text-sm font-semibold text-center">Set a savings goal to see your progress here</p>
            </motion.div>
          )}

          {/* Set goal */}
          <motion.div initial="hidden" animate="show" variants={fadeIn}
            className="rounded-[2.2rem] bg-white p-7 shadow-xl shadow-black/10">
            <p className="font-extrabold text-slate-800 text-base mb-1">🎯 My savings goal</p>
            <p className="text-xs text-slate-400 mb-5">Set how much you want to save</p>
            <p className="text-center text-5xl font-black text-slate-900 mb-5">€{goalDraft}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setGoalDraft(Math.max(goalDraft - 5, 0))}
                className="py-5 rounded-2xl font-extrabold text-2xl transition-all active:scale-95"
                style={{ background: "#fee2e2", color: "#dc2626" }}>− €5</button>
              <button onClick={() => setGoalDraft(goalDraft + 5)}
                className="py-5 rounded-2xl font-extrabold text-2xl transition-all active:scale-95"
                style={{ background: "#f0fdf4", color: "#16a34a" }}>+ €5</button>
            </div>
            <button onClick={confirmGoal}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-95"
              style={{ background: "#16a34a", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }}>
              ✅ Save goal
            </button>
          </motion.div>
        </div>

        {/* ── Row 3: Add to savings — full width, more preset amounts on iPad ── */}
        <motion.div initial="hidden" animate="show" variants={fadeIn}
          className="rounded-[2.2rem] bg-white p-7 shadow-xl shadow-black/10">
          <p className="font-extrabold text-slate-800 text-base mb-1">Add money to savings</p>
          <p className="text-xs text-slate-400 mb-5">This does not affect your daily balance</p>
          {/* 3 presets on phone, 6 on iPad */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[5, 10, 20, 50, 100, 200].map((v) => (
              <button key={v} onClick={() => addToSavings(v)}
                className="py-5 rounded-2xl font-extrabold text-xl text-white transition-all active:scale-95"
                style={{ background: "#16a34a", boxShadow: "0 4px 16px rgba(22,163,74,0.25)" }}>
                €{v}
              </button>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-4 px-4"
        style={{ background: "rgba(16,42,154,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {NAV.map((n) => (
          <button key={n.label} onClick={() => router.push(n.href)} className="flex flex-col items-center gap-0.5 min-w-[60px]">
            <span className="text-xl" style={{ color: n.active ? "#fff" : "rgba(255,255,255,0.35)" }}>{n.icon}</span>
            <span className="text-[10px] font-semibold" style={{ color: n.active ? "#fff" : "rgba(255,255,255,0.35)" }}>{n.label}</span>
            {n.active && <div className="w-5 h-0.5 rounded-full bg-white mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  );
}