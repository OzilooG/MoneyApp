"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Category = "Shopping" | "Food" | "Coffee" | "Transport" | "Bills" | "Other";

const categoryIcons: Record<Category, string> = {
  Shopping: "🛍️",
  Food: "🍔",
  Coffee: "☕",
  Transport: "🚗",
  Bills: "💡",
  Other: "🔹",
};

export default function SpendingPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [customBudget, setCustomBudget] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState<Category>("Other");

  /* ---------- LOAD USER & TRANSACTIONS ---------- */
  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (!name) {
      window.location.href = "/";
      return;
    }
    setUserName(name);

    const raw = localStorage.getItem(`user-${name}`);
    if (!raw) return;

    const data = JSON.parse(raw);
    setTransactions(data.transactions || []);
    setBudget(data.budget || 0);
  }, []);

  /* ---------- SAVE DATA ---------- */
  const saveTransactions = (newTransactions: any[], newBudget = budget) => {
    if (!userName) return;
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

  /* ---------- TEXT TO SPEECH ---------- */
  const speak = (text: string) => {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  };

  /* ---------- EXPENSE & BUDGET CALC ---------- */
  const spentTransactions = transactions.filter((t) => t.type === "subtract");
  const totalSpent = spentTransactions.reduce((sum, t) => sum + t.amount, 0);
  const progressPercent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  /* ---------- ADD EXPENSE ---------- */
  const addExpense = () => {
    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      speak("Please enter a valid amount");
      return;
    }

    const newTrans = [
      ...transactions,
      {
        id: Date.now(),
        type: "subtract",
        amount,
        category: newExpenseCategory,
        date: new Date().toISOString(),
      },
    ];

    setTransactions(newTrans);
    saveTransactions(newTrans);
    speak(`Added ${amount} euro to ${newExpenseCategory}`);
    setNewExpenseAmount("");
    setNewExpenseCategory("Other");
  };

  /* ---------- SET BUDGET ---------- */
  const setNewBudget = (amount: number) => {
    if (amount <= 0) return;
    setBudget(amount);
    saveTransactions(transactions, amount);
    speak(`Budget set to ${amount} euro`);
    setCustomBudget("");
  };

  return (
    <div className="min-h-screen bg-red-900 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* BACK BUTTON */}
        <Button
          onClick={() => {
            speak("Going back to main menu");
            router.push("/main");
          }}
          className="w-full text-2xl py-4 bg-slate-700 hover:bg-slate-600"
        >
          ⬅️ Back to Main Menu
        </Button>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-white text-center">
          🧾 My Spending
        </h1>

        {/* BUDGET DISPLAY */}
        <Card className="border-4 border-blue-500">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-2xl font-semibold">Budget</p>
            <p className="text-3xl font-bold">€{budget}</p>

            {/* PRESET BUDGET BUTTONS */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[100, 200, 500].map((b) => (
                <Button key={b} onClick={() => setNewBudget(b)} className="px-4 py-2">
                  €{b}
                </Button>
              ))}
            </div>

            {/* CUSTOM BUDGET */}
            <div className="flex gap-2 justify-center mt-2">
              <input
                type="number"
                placeholder="Set custom budget"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                className="p-2 rounded-lg text-center w-1/2"
              />
              <Button onClick={() => setNewBudget(Number(customBudget))} className="px-4 py-2">
                Set Budget
              </Button>
            </div>

            {/* BUDGET BAR */}
            <div className="w-full bg-gray-300 rounded-full h-8 mt-2">
              <div
                className="bg-green-500 h-8 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p>{Math.round(progressPercent)}% of budget used</p>

            {/* PIE CHART */}
            <div className="w-48 h-48 mx-auto relative mt-4">
              <div
                className="w-48 h-48 rounded-full"
                style={{
                  background: `conic-gradient(#10b981 ${progressPercent}%, #e5e7eb ${progressPercent}%)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-black">
                {Math.round(progressPercent)}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ADD EXPENSE */}
        <Card className="border-4 border-yellow-400">
          <CardContent className="p-6 space-y-4 text-center">
            <p className="text-2xl font-semibold">➕ Add Expense</p>

            <div className="flex flex-wrap gap-2 justify-center">
              {(["Shopping","Food","Coffee","Transport","Bills","Other"] as Category[]).map((cat) => (
                <Button
                  key={cat}
                  className={`px-4 py-2 ${newExpenseCategory === cat ? "bg-green-600 text-white" : "bg-gray-300 text-black"}`}
                  onClick={() => setNewExpenseCategory(cat)}
                >
                  {categoryIcons[cat]} {cat}
                </Button>
              ))}
            </div>

            <input
              type="number"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              placeholder="Amount €"
              className="w-full p-4 text-xl rounded-xl text-center"
            />

            <Button onClick={addExpense} className="w-full py-4 text-2xl bg-yellow-500">
              Submit Expense
            </Button>
          </CardContent>
        </Card>

        {/* VISUAL BARS */}
        <Card className="bg-white">
          <CardContent className="p-6 space-y-4">
            <p className="text-2xl font-bold text-center">Where my money went</p>
            {spentTransactions.length === 0 && <p className="text-center text-gray-500 text-xl">No spending yet</p>}
            {spentTransactions.map((t) => {
              const maxAmount = Math.max(...spentTransactions.map(tx => tx.amount), 1);
              const percent = (t.amount / maxAmount) * 100;
              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex justify-between">
                    <span>€{t.amount}</span>
                    <span className="text-sm text-gray-500">{categoryIcons[t.category as Category]} {t.category} - {new Date(t.date).toLocaleDateString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-5">
                    <div className="bg-red-500 h-5 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}