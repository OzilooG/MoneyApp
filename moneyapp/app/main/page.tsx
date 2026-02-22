"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function MainPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [savings, setSavings] = useState(0);
  const [spent, setSpent] = useState(0);
  const [userName, setUserName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    setBalance(data.balance || 0);
    setSavings(data.savings || 0);

    const spentTotal = (data.transactions || [])
      .filter((t: any) => t.type === "subtract")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    setSpent(spentTotal);
  }, []);

  // Text-to-speech
  function speak(text: string) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  }

  // Logout
  function logout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("isLoggedIn");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 relative">
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white">
          Hello {userName} 👋
        </h1>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white px-13 py-8"
          onClick={() => setShowLogoutConfirm(true)}
        >
          🚪 Log Out
        </Button>
      </div>

      <div className="grid gap-8 max-w-4xl mx-auto">

        {/* BALANCE CARD */}
        <Card
          className="cursor-pointer hover:scale-[1.02] transition border-4 border-blue-500"
          onClick={() => {
            router.push("/balance");
          }}
        >
          <CardContent className="p-10 text-center">
            <h2 className="text-2xl font-semibold">💰 My Money</h2>
            <p className="text-5xl font-bold mt-4">€{balance.toFixed(2)}</p>
            <p className="text-lg mt-2 text-gray-600">Tap to manage your money</p>
          </CardContent>
        </Card>

        {/* SAVINGS CARD */}
        <Card
          className="cursor-pointer hover:scale-[1.02] transition border-4 border-green-500"
          onClick={() => speak(`You have saved ${savings.toFixed(2)} euros`)}
        >
          <Link href="/savings" className="block">
            <CardContent className="p-10 text-center">
              <h2 className="text-2xl font-semibold">💎 My Savings</h2>
              <p className="text-5xl font-bold mt-4 text-green-700">€{savings.toFixed(2)}</p>
              <p className="text-lg mt-2 text-gray-600">This money is protected</p>
            </CardContent>
          </Link>
        </Card>

        {/* SPENDING CARD */}
        <Card
          className="cursor-pointer hover:scale-[1.02] transition border-4 border-red-500"
          onClick={() => speak(`You have spent ${spent.toFixed(2)} euros`)}
        >
          <Link href="/spent" className="block">
            <CardContent className="p-10 text-center">
              <h2 className="text-2xl font-semibold">🧾 Money I Spent</h2>
              <p className="text-5xl font-bold mt-4 text-red-600">€{spent.toFixed(2)}</p>
              <p className="text-lg mt-2 text-gray-600">Weekly and monthly view</p>
            </CardContent>
          </Link>
        </Card>

      </div>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="text-xl font-semibold">Are you sure you want to log out?</p>
            <div className="flex justify-around mt-4">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                onClick={logout}
              >
                Yes
              </Button>
              <Button
                className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-2"
                onClick={() => setShowLogoutConfirm(false)}
              >
                No
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}