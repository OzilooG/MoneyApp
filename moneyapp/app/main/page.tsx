"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function MyMoneyPage() {
  const [balance, setBalance] = useState(0);
  const [savings, setSavings] = useState(0);
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  // Load logged-in user info
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (!storedName) {
      window.location.href = "/";
      return;
    }

    setUserName(storedName);

    const userDataRaw = localStorage.getItem(`user-${storedName}`);
    if (userDataRaw) {
      const userData = JSON.parse(userDataRaw);
      setBalance(userData.balance || 0);
      setSavings(userData.savings || 0);
      setTransactions(userData.transactions || []);
    }
  }, []);

  // Save updates per user (PRESERVE PIN)
  useEffect(() => {
    if (!userName) return;

    const existingRaw = localStorage.getItem(`user-${userName}`);
    if (!existingRaw) return;

    const existingData = JSON.parse(existingRaw);

    localStorage.setItem(
      `user-${userName}`,
      JSON.stringify({
        ...existingData,
        balance,
        savings,
        transactions,
      })
    );
  }, [balance, savings, transactions, userName]);

  const value = Number(amount);

  function handleTransaction(type: "add" | "subtract") {
    setError("");

    if (!amount || value <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }

    if (type === "subtract" && value > balance) {
      setError("Insufficient balance");
      return;
    }

    const newBalance = type === "add" ? balance + value : balance - value;

    setBalance(newBalance);

    setTransactions([
      {
        id: crypto.randomUUID(),
        type,
        amount: value,
        date: new Date().toISOString(),
      },
      ...transactions,
    ]);

    setAmount("");
  }

  // Calculate spent this month
  const spentThisMonth = transactions
    .filter(
      (t) =>
        t.type === "subtract" &&
        new Date(t.date).getMonth() === new Date().getMonth() &&
        new Date(t.date).getFullYear() === new Date().getFullYear()
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex justify-center">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Welcome back{userName ? `, ${userName}` : ""} 👋
        </h1>

        <button
          onClick={() => {
            localStorage.removeItem("userName");
            localStorage.removeItem("isLoggedIn");
            window.location.href = "/";
          }}
          className="mt-2 text-sm text-red-300 hover:text-red-400 underline"
        >
          Log out
        </button>
      </div>

      <div className="w-full max-w-5xl space-y-6 mt-28">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/balance">
            <Card className="cursor-pointer hover:shadow-xl transition">
              <CardContent className="p-6 text-center">
                <h2 className="text-lg font-semibold">Balance</h2>
                <p className="text-3xl font-bold">€{balance.toFixed(2)}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/savings">
            <Card className="cursor-pointer hover:shadow-xl transition">
              <CardContent className="p-6 text-center">
                <h2 className="text-lg font-semibold">Savings</h2>
                <p className="text-3xl font-bold text-blue-600">
                  €{savings.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/spent">
            <Card className="cursor-pointer hover:shadow-xl transition">
              <CardContent className="p-6 text-center">
                <h2 className="text-lg font-semibold">Spent This Month</h2>
                <p className="text-3xl font-bold text-red-600">
                  €{spentThisMonth.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* MAIN BALANCE CARD */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <h1 className="text-2xl font-semibold">Quick Transaction</h1>
            <motion.p
              key={balance}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold"
            >
              €{balance.toFixed(2)}
            </motion.p>
          </CardContent>
        </Card>

        {/* TRANSACTION INPUT */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleTransaction("add")}
              >
                Add
              </Button>

              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleTransaction("subtract")}
              >
                Subtract
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

            <AnimatePresence>
              {transactions.length === 0 && (
                <p className="text-gray-500 text-sm">No transactions yet</p>
              )}

              {transactions.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-between items-center py-2 border-b"
                >
                  <div>
                    <p className="font-medium capitalize">{t.type}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(t.date).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${
                      t.type === "add" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "add" ? "+" : "-"}€{t.amount}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
