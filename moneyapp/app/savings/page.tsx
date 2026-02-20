"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SavingsPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [balance, setBalance] = useState(0);
  const [savings, setSavings] = useState(0);
  const [goal, setGoal] = useState(0);
  const [goalDraft, setGoalDraft] = useState(0);

  /* ---------- LOAD USER DATA ---------- */
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
    setBalance(data.balance || 0);
    setSavings(data.savings || 0);
    setGoal(data.savingsGoal || 0);
    setGoalDraft(data.savingsGoal || 0);
  }, []);

  /* ---------- SAVE USER DATA ---------- */
  function save(newSavings: number, newGoal = goal) {
    if (!userName) return;

    const raw = localStorage.getItem(`user-${userName}`);
    if (!raw) return;

    const existing = JSON.parse(raw);

    localStorage.setItem(
      `user-${userName}`,
      JSON.stringify({
        ...existing,
        savings: newSavings,
        savingsGoal: newGoal,
      })
    );
  }

  /* ---------- TEXT TO SPEECH ---------- */
  function speak(text: string) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  }

  /* ---------- ADD TO SAVINGS ---------- */
  function addToSavings(amount: number) {
    const newSavings = savings + amount;
    setSavings(newSavings);
    save(newSavings);
    speak(`${amount} euro added to savings`);
  }

  /* ---------- SAVE GOAL ---------- */
  function confirmGoal() {
    setGoal(goalDraft);
    save(savings, goalDraft);
    speak(`Savings goal set to ${goalDraft} euro`);
  }

  /* ---------- PIE CHART VALUES ---------- */
  const saved = Math.min(savings, goal);
  const remaining = Math.max(goal - savings, 0);
  const total = goal || 1;

  const savedAngle = (saved / total) * 360;

  return (
    <div className="min-h-screen bg-indigo-900 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* BACK */}
        <Button
          onClick={() => router.push("/main")}
          className="w-full text-2xl py-6 bg-slate-700"
        >
          ⬅️ Back to Main Menu
        </Button>

        <h1 className="text-5xl font-extrabold text-white text-center">
          💎 My Savings
        </h1>

        {/* SAVINGS TOTAL */}
        <Card className="border-4 border-yellow-400">
          <CardContent className="p-10 text-center space-y-4">
            <p className="text-2xl font-semibold">Money saved</p>
            <p className="text-6xl font-extrabold text-green-700">
              €{savings.toFixed(2)}
            </p>

            <Button
              onClick={() =>
                speak(`You have ${savings.toFixed(2)} euro saved`)
              }
              className="text-2xl py-6 bg-yellow-500 text-black"
            >
              🔊 Hear my savings
            </Button>
          </CardContent>
        </Card>

        {/* PIE CHART */}
        <Card className="border-4 border-purple-500">
          <CardContent className="p-8 space-y-6 text-center">
            <h2 className="text-3xl font-bold">
              🥧 My savings progress
            </h2>

            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              role="img"
              aria-label="Savings pie chart"
              className="mx-auto"
            >
              <circle cx="110" cy="110" r="100" fill="#e5e7eb" />
              <path
                d={`
                  M110 110
                  L110 10
                  A100 100 0 ${
                    savedAngle > 180 ? 1 : 0
                  } 1
                  ${
                    110 +
                    100 *
                      Math.sin((Math.PI * savedAngle) / 180)
                  }
                  ${
                    110 -
                    100 *
                      Math.cos((Math.PI * savedAngle) / 180)
                  }
                  Z
                `}
                fill="#16a34a"
              />
            </svg>

            <p className="text-xl">
              🟢 Saved: €{saved}
            </p>
            <p className="text-xl">
              ⚪ Left to save: €{remaining}
            </p>
          </CardContent>
        </Card>

        {/* SET YOUR OWN GOAL */}
        <Card className="border-4 border-blue-500">
          <CardContent className="p-8 space-y-6 text-center">
            <h2 className="text-3xl font-bold">
              🎯 Set my savings goal
            </h2>

            <p className="text-5xl font-extrabold">
              €{goalDraft}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                className="text-4xl py-8"
                onClick={() =>
                  setGoalDraft(Math.max(goalDraft - 5, 0))
                }
              >
                − €5
              </Button>

              <Button
                className="text-4xl py-8"
                onClick={() => setGoalDraft(goalDraft + 5)}
              >
                + €5
              </Button>
            </div>

            <Button
              onClick={confirmGoal}
              className="w-full text-3xl py-8 bg-green-600"
            >
              ✅ Save goal
            </Button>
          </CardContent>
        </Card>

        {/* ADD TO SAVINGS */}
        <Card className="border-4 border-green-500">
          <CardContent className="p-8 text-center space-y-6">
            <h2 className="text-3xl font-bold">
              Add money to savings
            </h2>

            <p className="text-xl text-gray-600">
              This does NOT affect your daily money
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[5, 10, 20].map((v) => (
                <Button
                  key={v}
                  className="text-3xl py-8"
                  onClick={() => addToSavings(v)}
                >
                  €{v}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}