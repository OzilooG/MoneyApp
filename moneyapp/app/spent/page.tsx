"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { getUserData, deriveSpent, type Transaction, type UserData } from "@/lib/moneyData";
import { fetchFromMongo, saveAndSync } from "@/lib/financeSync";

type Category = "Food" | "Transport" | "Other";

const CATEGORIES: { key: Category; emoji: string; color: string; light: string; border: string }[] = [
  { key: "Food", emoji: "🍔", color: "#ea580c", light: "#fff7ed", border: "#fed7aa" },
  { key: "Transport", emoji: "🚗", color: "#2563eb", light: "#eff6ff", border: "#bfdbfe" },
  { key: "Other", emoji: "🔹", color: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1],
    },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1],
    },
  },
};

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

const NAV = [
  { icon: "⌂", label: "Home", active: false, href: "/main" },
  { icon: "◈", label: "Spending", active: true, href: "/spent" },
  { icon: "◉", label: "Savings", active: false, href: "/savings" },
];

export default function SpendingPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState(0);
  const [amount, setAmount] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [fullData, setFullData] = useState<UserData | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("userName") || "";
    const userId = localStorage.getItem("userId") || "";

    if (!name) {
      router.push("/");
      return;
    }

    setUserName(name);

    async function load() {
      if (userId) {
        await fetchFromMongo(name, userId);
      }

      const data = getUserData(name);
      setFullData(data);
      setTransactions(data.transactions);
      setBudget(data.budget);
    }

    load();
  }, [router]);

  function save(newTransactions: Transaction[], newBudget = budget) {
    if (!userName || !fullData) return;

    const updated: UserData = {
      ...fullData,
      transactions: newTransactions,
      budget: newBudget,
    };

    setFullData(updated);
    saveAndSync(userName, updated);
  }

  function addExpense() {
    const value = Number(amount);
    if (value <= 0) return;

    const newTx: Transaction = {
      id: Date.now(),
      type: "subtract",
      amount: value,
      category,
      note: "",
      date: new Date().toISOString(),
    };

    const newTransactions = [...transactions, newTx];
    setTransactions(newTransactions);
    save(newTransactions);
    speak(`${value} euro spent on ${category}`);
    setAmount("");
    setPresetAmount("");
  }

  function resetSpending() {
    const confirmed = window.confirm("Are you sure you want to reset all spending?");
    if (!confirmed) return;

    const cleared = transactions.filter((t) => t.type !== "subtract");
    setTransactions(cleared);
    save(cleared);
  }

  const spent = deriveSpent(transactions);
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const selectedCat = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div
      className="min-h-screen w-full pb-28"
      style={{ background: "linear-gradient(135deg, #5878FF 0%, #335BFF 50%, #102A9A 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 max-w-7xl mx-auto">
        <div>
          <p className="text-white/55 text-sm font-medium">My Money</p>
          <h1 className="text-white text-2xl font-extrabold mt-0.5">Spending 🧾</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/main")}
            className="px-4 py-2 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            ⌂ Home
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("userName");
              localStorage.removeItem("userId");
              router.push("/");
            }}
            className="px-4 py-2 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="px-4 max-w-7xl mx-auto flex flex-col gap-4">
        {/* ── Row 1: Spent summary card — full width ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="rounded-[2.2rem] bg-white p-7 shadow-2xl shadow-black/20"
          style={{ border: "1px solid rgba(255,255,255,0.8)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:gap-8">
            <div className="flex-1 text-center md:text-left">
              <p className="text-slate-400 text-sm font-medium">Spent this month</p>
              <p className="text-5xl font-black mt-1 tracking-tight" style={{ color: "#ea580c" }}>
                €{spent.toFixed(2)}
              </p>
              <div className="flex justify-center md:justify-start mt-3">
                <button
                  onClick={() => speak(`You have spent ${spent.toFixed(2)} euro this month`)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                  style={{
                    background: "#fff7ed",
                    color: "#ea580c",
                    border: "1.5px solid #fed7aa",
                  }}
                >
                  🔈 Read my spending
                </button>
              </div>
            </div>

            {budget > 0 && (
              <div className="flex-1 mt-5 md:mt-0">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">of €{budget} budget</span>
                  <span style={{ color: percent >= 90 ? "#dc2626" : "#ea580c" }}>
                    {Math.round(percent)}% used
                  </span>
                </div>
                <div className="w-full h-4 bg-orange-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: [0, 0, 0.2, 1], delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        percent >= 90 ? "#dc2626" : "linear-gradient(90deg, #fb923c, #ea580c)",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#fff7ed" }}>
                    <p className="text-[11px] text-orange-500 font-semibold">Spent</p>
                    <p className="text-xl font-extrabold text-orange-600">
                      €{spent.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#fff7ed" }}>
                    <p className="text-[11px] text-orange-500 font-semibold">Remaining</p>
                    <p className="text-xl font-extrabold text-orange-600">
                      €{Math.max(budget - spent, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Row 2: Budget setter + Add expense side by side on iPad ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeIn}
            className="rounded-[2.2rem] bg-white p-6 shadow-xl shadow-black/10"
          >
            <p className="font-extrabold text-slate-800 text-base mb-1">📊 My monthly budget</p>
            <p className="text-xs text-slate-400 mb-4">Tap to set your spending limit</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[100, 200, 300, 500, 750, 1000].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBudget(b);
                    save(transactions, b);
                  }}
                  className="py-4 rounded-2xl font-extrabold text-sm transition-all active:scale-95"
                  style={{
                    background: budget === b ? "#2563eb" : "#eff6ff",
                    color: budget === b ? "white" : "#2563eb",
                    border: "1.5px solid #bfdbfe",
                  }}
                >
                  €{b}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeIn}
            className="rounded-[2.2rem] bg-white p-6 shadow-xl shadow-black/10"
          >
            <p className="font-extrabold text-slate-800 text-base mb-1">➕ Add spending</p>
            <p className="text-xs text-slate-400 mb-4">What did you spend money on?</p>

            <div className="flex gap-3 mb-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center gap-1"
                  style={{
                    background: category === c.key ? c.color : c.light,
                    color: category === c.key ? "white" : c.color,
                    border: `1.5px solid ${c.border}`,
                  }}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span>{c.key}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[5, 10, 20, 50].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setPresetAmount(String(v));
                    setAmount(String(v));
                  }}
                  className="py-3 rounded-2xl font-extrabold text-base transition-all active:scale-95"
                  style={{
                    background: presetAmount === String(v) ? selectedCat.color : selectedCat.light,
                    color: presetAmount === String(v) ? "white" : selectedCat.color,
                    border: `1.5px solid ${selectedCat.border}`,
                  }}
                >
                  €{v}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Or type amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setPresetAmount("");
              }}
              className="w-full rounded-2xl border px-4 py-3 text-lg font-semibold outline-none mb-3 focus:ring-4"
              style={{ borderColor: selectedCat.border, background: selectedCat.light }}
            />

            <button
              onClick={addExpense}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-95"
              style={{
                background: selectedCat.color,
                boxShadow: `0 4px 20px ${selectedCat.color}55`,
              }}
            >
              ✅ Add {category} expense
            </button>
          </motion.div>
        </div>

        {/* ── Reset — full width, subtle ── */}
        <motion.div initial="hidden" animate="show" variants={fadeIn}>
          <button
            onClick={resetSpending}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(255,255,255,0.2)",
            }}
          >
            ♻️ Reset all spending
          </button>
        </motion.div>
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-4 px-4"
        style={{
          background: "rgba(16,42,154,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {NAV.map((n) => (
          <button
            key={n.label}
            onClick={() => router.push(n.href)}
            className="flex flex-col items-center gap-0.5 min-w-[60px]"
          >
            <span
              className="text-xl"
              style={{ color: n.active ? "#fff" : "rgba(255,255,255,0.35)" }}
            >
              {n.icon}
            </span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: n.active ? "#fff" : "rgba(255,255,255,0.35)" }}
            >
              {n.label}
            </span>
            {n.active && <div className="w-5 h-0.5 rounded-full bg-white mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  );
}