"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUserData,
  deriveIncome,
  deriveSpent,
  deriveCurrentBalance,
  type Transaction,
  type UserData,
} from "@/lib/moneyData";
import { fetchFromMongo, saveAndSync } from "@/lib/financeSync";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } } };
const fadeIn  = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.38, ease: "easeOut" } } };

function getEmoji(pct: number) {
  if (pct <= 50) return { emoji: "😁", label: "Great",     color: "#16a34a" };
  if (pct <= 75) return { emoji: "😊", label: "Good",      color: "#65a30d" };
  return               { emoji: "😐", label: "Watch this", color: "#d97706" };
}

function getSavingsEmoji(pct: number) {
  if (pct >= 75) return { emoji: "😁", label: "Almost there!", color: "#16a34a" };
  if (pct >= 40) return { emoji: "😊", label: "On track",      color: "#65a30d" };
  return               { emoji: "😐", label: "Keep going",     color: "#d97706" };
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function formatDate(iso: string): string {
  try {
    const date  = new Date(iso);
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff  = Math.round((today.getTime() - txDay.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7)   return date.toLocaleDateString("en-IE", { weekday: "short" });
    return date.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function deriveCategories(transactions: Transaction[]) {
  const map: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "subtract")
    .forEach((t) => { map[t.category || "Other"] = (map[t.category || "Other"] || 0) + t.amount; });
  return Object.entries(map).map(([name, spent]) => ({ name, spent }));
}

const NAV = [
  { icon: "⌂", label: "Home",     active: true,  href: "/main"    },
  { icon: "◈", label: "Spending", active: false, href: "/spent"   },
  { icon: "◉", label: "Savings",  active: false, href: "/savings" },
];

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName]   = useState("");
  const [speaking, setSpeaking]   = useState(false);

  const [startingBalance, setStartingBalance] = useState(0);
  const [hasSetBalance, setHasSetBalance]     = useState(true);
  const [transactions, setTransactions]       = useState<Transaction[]>([]);
  const [savings, setSavings]                 = useState(0);
  const [savingsGoal, setSavingsGoal]         = useState(0);
  const [budget, setBudget]                   = useState(0);

  const [showIncomePanel, setShowIncomePanel] = useState(false);
  const [incomeAmount, setIncomeAmount]       = useState("");
  const [incomeNote, setIncomeNote]           = useState("");
  const [balanceInput, setBalanceInput]       = useState("");

  useEffect(() => {
    const name   = localStorage.getItem("userName") || "";
    const userId = localStorage.getItem("userId")   || "";
    if (!name) { router.push("/"); return; }
    setUserName(name);
    async function load() {
      if (userId) await fetchFromMongo(name, userId);
      const data = getUserData(name);
      setStartingBalance(data.balance);
      setHasSetBalance(data.hasSetBalance);
      setTransactions(data.transactions);
      setSavings(data.savings);
      setSavingsGoal(data.savingsGoal);
      setBudget(data.budget);
    }
    load();
  }, [router]);

  const income   = deriveIncome(transactions);
  const spent    = deriveSpent(transactions);
  const balance  = deriveCurrentBalance(startingBalance, transactions);
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const categories = deriveCategories(transactions);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const initials = userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  function currentData(): UserData {
    return { balance: startingBalance, hasSetBalance, transactions, savings, savingsGoal, budget };
  }

  function handleSpeak() {
    setSpeaking(true);
    speak(`${greeting} ${userName}. You have €${balance.toLocaleString()} available. This month you earned €${income.toLocaleString()} and spent €${spent.toLocaleString()}.`);
    setTimeout(() => setSpeaking(false), 4000);
  }

  function handleSetBalance() {
    const value = Number(balanceInput);
    if (balanceInput === "" || value < 0) return;
    const updated: UserData = { ...currentData(), balance: value, hasSetBalance: true };
    setStartingBalance(value);
    setHasSetBalance(true);
    setBalanceInput("");
    saveAndSync(userName, updated);
  }

  function handleAddIncome() {
    const value = Number(incomeAmount);
    if (!value || value <= 0) return;
    const newTransaction: Transaction = {
      id: Date.now(), type: "add", amount: value,
      category: "Income", note: incomeNote.trim(), date: new Date().toISOString(),
    };
    const newTransactions = [...transactions, newTransaction];
    setTransactions(newTransactions);
    saveAndSync(userName, { ...currentData(), transactions: newTransactions });
    setIncomeAmount(""); setIncomeNote(""); setShowIncomePanel(false);
    speak(`${value} euro added as income`);
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(135deg, #5878FF 0%, #335BFF 50%, #102A9A 100%)" }}>

      {/* First-time balance popup */}
      <AnimatePresence>
        {!hasSetBalance && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(10,20,80,0.75)", backdropFilter: "blur(6px)" }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6">
              <div className="w-full max-w-sm bg-white rounded-[2.2rem] p-8 shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                  style={{ background: "#eff6ff" }}>💰</div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Welcome, {userName}!</h2>
                <p className="text-slate-500 text-sm mb-6">Enter how much money you currently have to get started.</p>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">€</span>
                  <input type="number" placeholder="0.00" value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetBalance()}
                    className="w-full rounded-2xl border-2 pl-10 pr-4 py-4 text-2xl font-extrabold text-slate-900 outline-none text-center focus:ring-4 focus:ring-blue-200"
                    style={{ borderColor: "#bfdbfe" }} autoFocus />
                </div>
                <button onClick={handleSetBalance}
                  className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #5878FF, #335BFF)", boxShadow: "0 4px 20px rgba(51,91,255,0.4)" }}>
                  Let's go →
                </button>
                <p className="text-xs text-slate-400 mt-4">Income and spending will update your balance automatically.</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 max-w-7xl mx-auto">
        <div>
          <p className="text-white/55 text-sm font-medium">{greeting},</p>
          <h1 className="text-white text-2xl font-extrabold mt-0.5">{userName || "there"} 👋</h1>
        </div>
        <button
          onClick={() => { localStorage.removeItem("userName"); localStorage.removeItem("userId"); router.push("/"); }}
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm"
          style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.3)" }}>
          {initials}
        </button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show"
        className="px-4 pb-28 max-w-7xl mx-auto flex flex-col gap-4">

        {/* Balance card — full width always */}
        <motion.div variants={fadeUp}
          className="rounded-[2.2rem] bg-white p-6 shadow-2xl shadow-black/20"
          style={{ border: "1px solid rgba(255,255,255,0.8)" }}>
          <p className="text-center text-slate-400 text-sm font-medium">Total money available</p>
          <p className="text-center text-5xl font-black text-slate-900 mt-1 tracking-tight">
            €{balance.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex justify-center mt-3">
            <button onClick={handleSpeak}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: speaking ? "#2e5bff" : "#eff6ff", color: speaking ? "#fff" : "#2e5bff", border: "1.5px solid #bfdbfe" }}>
              <span>{speaking ? "🔊" : "🔈"}</span>
              {speaking ? "Reading aloud…" : "Read my balance"}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl p-3 text-center" style={{ background: "#f0fdf4" }}>
              <p className="text-[11px] text-green-600 font-semibold">Income</p>
              <p className="text-base font-extrabold text-green-700">€{income.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "#fff7ed" }}>
              <p className="text-[11px] text-orange-500 font-semibold">Spent</p>
              <p className="text-base font-extrabold text-orange-600">€{spent.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "#eff6ff" }}>
              <p className="text-[11px] text-blue-500 font-semibold">Balance</p>
              <p className="text-base font-extrabold text-blue-700">€{balance.toLocaleString()}</p>
            </div>
          </div>
          {income + spent > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-2">Income vs Spending</p>
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                <div className="flex items-center justify-end pr-2 rounded-l-full"
                  style={{ width: `${Math.round((income / (income + spent)) * 100)}%`, background: "#16a34a" }}>
                  <span className="text-[9px] font-bold text-white">€{income.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-start pl-2 rounded-r-full"
                  style={{ width: `${Math.round((spent / (income + spent)) * 100)}%`, background: "#ea580c" }}>
                  <span className="text-[9px] font-bold text-white">€{spent}</span>
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-green-600 font-semibold">● Income</span>
                <span className="text-[10px] text-orange-500 font-semibold">● Spending</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick actions — 2 col phone, 4 col tablet/desktop */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setShowIncomePanel((v) => !v)}
            className="flex flex-col items-center justify-center gap-1 py-5 rounded-[1.5rem] font-bold text-white"
            style={{ background: "#16a34a", boxShadow: "0 4px 20px rgba(22,163,74,0.35)" }}>
            <span className="text-2xl leading-none">＋</span>
            <span className="text-sm font-extrabold">Add Income</span>
            <span className="text-[10px] font-normal opacity-70">Money coming in</span>
          </button>
          <button onClick={() => router.push("/spent")}
            className="flex flex-col items-center justify-center gap-1 py-5 rounded-[1.5rem] font-bold text-white"
            style={{ background: "#ea580c", boxShadow: "0 4px 20px rgba(234,88,12,0.35)" }}>
            <span className="text-2xl leading-none">－</span>
            <span className="text-sm font-extrabold">Add Expense</span>
            <span className="text-[10px] font-normal opacity-70">Money going out</span>
          </button>
          <button onClick={() => router.push("/savings")}
            className="flex items-center justify-center gap-2 py-5 rounded-[1.5rem] font-semibold text-white text-sm"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)" }}>
            ◎ Savings Goal
          </button>
          <button onClick={() => router.push("/spent")}
            className="flex items-center justify-center gap-2 py-5 rounded-[1.5rem] font-semibold text-white text-sm"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)" }}>
            ≡ Transactions
          </button>
        </motion.div>

        {/* Add Income panel */}
        <AnimatePresence>
          {showIncomePanel && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
              className="bg-white rounded-[2.2rem] p-6 shadow-2xl shadow-black/20">
              <h2 className="font-extrabold text-slate-800 text-base mb-4">💰 Add Income</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                {[100, 200, 500, 1000, 1500, 2000].map((v) => (
                  <button key={v} onClick={() => setIncomeAmount(String(v))}
                    className="py-3 rounded-2xl font-extrabold text-sm transition-all active:scale-95"
                    style={{ background: incomeAmount === String(v) ? "#16a34a" : "#f0fdf4", color: incomeAmount === String(v) ? "#fff" : "#16a34a", border: "1.5px solid #bbf7d0" }}>
                    €{v}
                  </button>
                ))}
              </div>
              <div className="flex flex-col md:flex-row gap-3 mb-3">
                <input type="number" placeholder="Or enter amount" value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-green-200" />
                <input type="text" placeholder="Note (optional)" value={incomeNote}
                  onChange={(e) => setIncomeNote(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-green-200" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddIncome}
                  className="flex-1 py-3 rounded-2xl font-extrabold text-white text-sm transition-all active:scale-95"
                  style={{ background: "#16a34a", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }}>
                  ✅ Add Income
                </button>
                <button onClick={() => { setShowIncomePanel(false); setIncomeAmount(""); setIncomeNote(""); }}
                  className="flex-1 py-3 rounded-2xl font-semibold text-slate-600 text-sm bg-slate-100 transition-all active:scale-95">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spending + Savings — side by side on tablet/desktop, stacked on phone */}
        {/* These use their own initial/animate so the grid wrapper doesn't break stagger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Spending card */}
          <motion.div
            initial="hidden" animate="show" variants={fadeIn}
            className="bg-white rounded-[2.2rem] overflow-hidden shadow-xl shadow-black/10">
            <div className="h-1.5 w-full" style={{ background: "#ea580c" }} />
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-extrabold text-slate-800 text-base">Spent this month</h2>
                <span onClick={() => router.push("/spent")}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full cursor-pointer">View all</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black text-orange-500">€{spent}</span>
                {budget > 0 && <span className="text-sm text-slate-400">of €{budget} budget</span>}
              </div>
              {budget > 0 && (
                <div className="w-full h-3 bg-orange-50 rounded-full overflow-hidden mb-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${spentPct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #fb923c, #ea580c)" }} />
                </div>
              )}
              {categories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {categories.slice(0, 3).map((c) => {
                    const pct = spent > 0 ? Math.round((c.spent / spent) * 100) : 0;
                    const { emoji, label, color } = getEmoji(pct);
                    return (
                      <div key={c.name} className="rounded-2xl p-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{emoji}</span>
                            <span className="font-bold text-slate-700 text-sm">{c.name}</span>
                          </div>
                          <span className="text-sm font-extrabold text-orange-600">€{c.spent.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden mb-0.5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#ea580c", opacity: 0.8 }} />
                        </div>
                        <p className="text-[10px] font-medium" style={{ color }}>{label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No spending recorded yet</p>
              )}
            </div>
          </motion.div>

          {/* Savings card */}
          <motion.div
            initial="hidden" animate="show" variants={fadeIn}
            className="bg-white rounded-[2.2rem] overflow-hidden shadow-xl shadow-black/10">
            <div className="h-1.5 w-full" style={{ background: "#16a34a" }} />
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-extrabold text-slate-800 text-base">Savings goals</h2>
                <span onClick={() => router.push("/savings")}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full cursor-pointer">Add goal</span>
              </div>
              {savingsGoal > 0 ? (
                <>
                  {(() => {
                    const pct = Math.min(Math.round((savings / savingsGoal) * 100), 100);
                    const { emoji, label, color } = getSavingsEmoji(pct);
                    return (
                      <div className="rounded-2xl p-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{emoji}</span>
                            <span className="font-bold text-slate-700 text-sm">My Savings</span>
                          </div>
                          <span className="text-xs text-slate-400">€{savings.toLocaleString()} / €{savingsGoal.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 bg-green-100 rounded-full overflow-hidden mb-1">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #4ade80, #16a34a)" }} />
                        </div>
                        <p className="text-[11px] font-medium" style={{ color }}>{label} · {pct}% complete</p>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="rounded-2xl p-3 text-center" style={{ background: "#f0fdf4" }}>
                      <p className="text-[11px] text-green-600 font-semibold">Saved</p>
                      <p className="text-xl font-extrabold text-green-700">€{savings.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl p-3 text-center" style={{ background: "#f0fdf4" }}>
                      <p className="text-[11px] text-green-600 font-semibold">Goal</p>
                      <p className="text-xl font-extrabold text-green-700">€{savingsGoal.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-4xl">🎯</span>
                  <p className="text-sm text-slate-400 italic text-center">No savings goal set yet.</p>
                  <span onClick={() => router.push("/savings")}
                    className="text-blue-500 font-semibold text-sm cursor-pointer">Set one →</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent activity — full width, 2 col transactions on tablet/desktop */}
        <motion.div
          initial="hidden" animate="show" variants={fadeIn}
          className="bg-white rounded-[2.2rem] p-5 shadow-xl shadow-black/10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-extrabold text-slate-800 text-base">Recent activity</h2>
            <span onClick={() => router.push("/spent")}
              className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full cursor-pointer">See all</span>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {recentTransactions.map((t) => {
                const isIncome = t.type === "add";
                const label    = t.note ? t.note : t.category;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0"
                      style={{ background: isIncome ? "#dcfce7" : "#fee2e2", color: isIncome ? "#16a34a" : "#dc2626" }}>
                      {isIncome ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{label}</p>
                      <p className="text-xs text-slate-400">{t.category} · {formatDate(t.date)}</p>
                    </div>
                    <span className="text-sm font-extrabold shrink-0"
                      style={{ color: isIncome ? "#16a34a" : "#dc2626" }}>
                      {isIncome ? "+" : "−"}€{t.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No transactions yet</p>
          )}
        </motion.div>

      </motion.div>

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