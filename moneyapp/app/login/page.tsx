"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MyMoneyPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  // Load from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("money-app"));
    if (stored) {
      setBalance(stored.balance);
      setTransactions(stored.transactions);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(
      "money-app",
      JSON.stringify({ balance, transactions })
    );
  }, [balance, transactions]);

  const value = Number(amount);

  const userName =
  typeof window !== "undefined"
    ? localStorage.getItem("userName")
    : "";

  function handleTransaction(type) {
    setError("");

    if (!amount || value <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }

    if (type === "subtract" && value > balance) {
      setError("Insufficient balance");
      return;
    }

    const newBalance =
      type === "add" ? balance + value : balance - value;

    setBalance(newBalance);

    setTransactions([
      {
        id: crypto.randomUUID(),
        type,
        amount: value,
        date: new Date().toLocaleString(),
      },
      ...transactions,
    ]);

    setAmount("");
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex justify-center">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
    Welcome back{userName ? `, ${userName}` : ""} 👋
  </h1>

  <button
    onClick={() => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      window.location.href = "/";
    }}
    className="mt-2 text-sm text-red-300 hover:text-red-400 underline"
  >
    Log out
  </button>
</div>

<div className="w-full max-w-lg space-y-6 mt-28">
        <Card className="rounded-2xl shadow-xl">
          <CardContent className="p-6 text-center space-y-2">
            <h1 className="text-2xl font-semibold">My Balance</h1>
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

        <Card>
          <CardContent className="p-6 space-y-4">
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

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

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Transaction History
            </h2>

            <AnimatePresence>
              {transactions.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No transactions yet
                </p>
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
                    <p className="text-xs text-gray-500">{t.date}</p>
                  </div>
                  <p
                    className={`font-semibold ${
                      t.type === "add"
                        ? "text-green-600"
                        : "text-red-600"
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
