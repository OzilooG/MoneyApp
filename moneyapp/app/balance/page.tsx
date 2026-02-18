"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = "cash" | "bank" | "postoffice";

const CATEGORY_CONFIG = {
  cash: { label: "Cash", emoji: "💵", color: "bg-green-500" },
  bank: { label: "Bank", emoji: "🏦", color: "bg-blue-500" },
  postoffice: { label: "Post Office", emoji: "📮", color: "bg-orange-500" },
};

export default function BalancePage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [balances, setBalances] = useState({
    cash: 0,
    bank: 0,
    postoffice: 0,
  });

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");

  /* ---------- LOAD USER ---------- */
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
    setBalances(
      data.balances || { cash: 0, bank: 0, postoffice: 0 }
    );
  }, []);

  /* ---------- SAVE ---------- */
  useEffect(() => {
    if (!userName) return;

    const raw = localStorage.getItem(`user-${userName}`);
    if (!raw) return;

    const existing = JSON.parse(raw);
    const total =
      balances.cash + balances.bank + balances.postoffice;

    localStorage.setItem(
      `user-${userName}`,
      JSON.stringify({
        ...existing,
        balances,
        balance: total,
      })
    );
  }, [balances, userName]);

  /* ---------- TEXT TO SPEECH ---------- */
  function speak(text: string) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  }

  /* ---------- ADD MONEY ---------- */
  function addMoney(value: number) {
    if (!activeCategory || value <= 0) return;

    setBalances((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory] + value,
    }));

    speak(`Added ${value} euro to ${CATEGORY_CONFIG[activeCategory].label}`);
    setActiveCategory(null);
    setAmount("");
  }

  const maxBalance = Math.max(
    balances.cash,
    balances.bank,
    balances.postoffice,
    1
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex justify-center">
      <div className="w-full max-w-5xl space-y-8">

        {/* BACK BUTTON */}
        <Button
          onClick={() => {
            speak("Going back to main menu");
            router.push("/main");
          }}
          className="w-full text-2xl py-6 bg-slate-700 hover:bg-slate-600"
        >
          ⬅️ Back to Main Menu
        </Button>

        <h1 className="text-4xl font-bold text-white text-center">
          My Money 💰
        </h1>

        {/* CATEGORY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map((key) => {
            const c = CATEGORY_CONFIG[key];
            const percent = (balances[key] / maxBalance) * 100;

            return (
              <Card
                key={key}
                onClick={() => {
                  setActiveCategory(key);
                  speak(`Add money to ${c.label}`);
                }}
                className="cursor-pointer border-4"
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div className="text-6xl">{c.emoji}</div>
                  <h2 className="text-3xl font-bold">{c.label}</h2>
                  <p className="text-4xl font-extrabold">
                    €{balances[key].toFixed(2)}
                  </p>

                  {/* PROGRESS BAR */}
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className={`${c.color} h-6 rounded-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ADD MONEY PANEL */}
        {activeCategory && (
          <Card className="border-4 border-green-500">
            <CardContent className="p-8 text-center space-y-6">
              <h2 className="text-3xl font-bold">
                Add Money to {CATEGORY_CONFIG[activeCategory].label}
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {[5, 10, 20].map((v) => (
                  <Button
                    key={v}
                    className="text-3xl py-8"
                    onClick={() => addMoney(v)}
                  >
                    €{v}
                  </Button>
                ))}
              </div>

              <Input
                type="number"
                placeholder="Other amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl p-6"
              />

              <Button
                className="w-full text-2xl py-8 bg-green-600"
                onClick={() => addMoney(Number(amount))}
              >
                ➕ Add Money
              </Button>

              <Button
                variant="secondary"
                className="w-full text-xl py-6"
                onClick={() => setActiveCategory(null)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
