"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Category = "Food" | "Transport" | "Other";

const categoryIcons: Record<Category, string> = {
  Food: "🍔",
  Transport: "🚗",
  Other: "🔹",
};

export default function SpendingPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");

  const presetAmounts = [5, 10, 20, 50];

  /* ---------- LOAD USER ---------- */
  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (!name) {
      router.push("/");
      return;
    }

    setUserName(name);

    const raw = localStorage.getItem(`user-${name}`);
    if (!raw) return;

    const data = JSON.parse(raw);
    setTransactions(data.transactions || []);
    setBudget(data.budget || 0);
  }, [router]);

  /* ---------- SAVE ---------- */
  const save = (newTransactions: any[], newBudget = budget) => {
    const raw = localStorage.getItem(`user-${userName}`);
    if (!raw) return;

    const data = JSON.parse(raw);
    localStorage.setItem(
      `user-${userName}`,
      JSON.stringify({
        ...data,
        transactions: newTransactions,
        budget: newBudget,
      })
    );
  };

  /* ---------- CALCULATIONS ---------- */
  const spent = transactions
    .filter((t) => t.type === "subtract")
    .reduce((s, t) => s + t.amount, 0);

  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  /* ---------- ADD EXPENSE ---------- */
  const addExpense = () => {
    const value = Number(amount);
    if (value <= 0) return;

    const newTx = [
      ...transactions,
      {
        id: Date.now(),
        type: "subtract",
        amount: value,
        category,
        date: new Date().toISOString(),
      },
    ];

    setTransactions(newTx);
    save(newTx);
    setAmount("");
  };

  const resetSpending = () => {
  const confirmed = window.confirm(
    "Are you sure you want to reset money spent everywhere?"
  );
  if (!confirmed) return;

  const clearedTransactions = transactions.filter(
    (t) => t.type !== "subtract"
  );

  setTransactions(clearedTransactions);
  save(clearedTransactions);
};

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex justify-center">
      <div className="w-full max-w-xl space-y-10">

        {/* BACK */}
        <Button
          onClick={() => router.push("/main")}
          className="w-full text-3xl py-10 bg-slate-700"
        >
          ⬅️ Go Back
        </Button>

        {/* TITLE */}
        <h1 className="text-4xl font-bold text-white text-center">
          🧾 My Spending
        </h1>

        {/* RESET BUTTON (SIMPLE) */}
        <Button
          onClick={resetSpending}
          className="w-full text-2xl py-6 bg-red-600 hover:bg-red-700"
        >
          ♻️ Reset Spending
        </Button>

        {/* BUDGET */}
        <Card className="border-4 border-blue-500">
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-2xl font-semibold">My Budget</p>
            <p className="text-4xl font-bold">€{budget}</p>

            <div className="flex gap-4 justify-center">
              {[100, 200, 500].map((b) => (
                <Button
                  key={b}
                  onClick={() => {
                    setBudget(b);
                    save(transactions, b);
                  }}
                  className="text-2xl px-8 py-6"
                >
                  €{b}
                </Button>
              ))}
            </div>

            {/* PIE */}
            <div className="w-40 h-40 mx-auto">
              <div
                className="w-40 h-40 rounded-full"
                style={{
                  background: `conic-gradient(red ${percent}%, #e5e7eb ${percent}%)`,
                }}
              />
            </div>

            <p className="text-xl">{Math.round(percent)}% used</p>
          </CardContent>
        </Card>

        {/* ADD EXPENSE */}
        <Card className="border-4 border-yellow-400">
          <CardContent className="p-8 space-y-6 text-center">
            <p className="text-3xl font-semibold">Add Spending</p>

            {/* CATEGORY */}
            <div className="space-y-4">
              {(Object.keys(categoryIcons) as Category[]).map((c) => (
                <Button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`w-full text-2xl py-6 ${
                    category === c
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {categoryIcons[c]} {c}
                </Button>
              ))}
            </div>

            {/* AMOUNT PRESETS */}
            <div className="grid grid-cols-2 gap-4">
              {presetAmounts.map((v) => (
                <Button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className={`text-3xl py-8 ${
                    amount === String(v)
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  €{v}
                </Button>
              ))}
            </div>

            {/* MANUAL INPUT */}
            <input
              type="number"
              placeholder="Or type amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-3xl p-6 rounded-xl text-center"
            />

            {/* ADD */}
            <Button
              onClick={addExpense}
              className="w-full text-3xl py-8 bg-yellow-500"
            >
              ✅ Add
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}