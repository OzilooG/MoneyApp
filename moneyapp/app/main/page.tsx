"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MoneyData = {
  balance: number;
  savings: number;
  spent: number;
};

function readMoneyData(userName: string): MoneyData {
  const raw = localStorage.getItem(`user-${userName}`);
  if (!raw) return { balance: 0, savings: 0, spent: 0 };

  try {
    const parsed = JSON.parse(raw);
    return {
      balance: Number(parsed?.balance ?? 0),
      savings: Number(parsed?.savings ?? 0),
      spent: Number(parsed?.spent ?? 0),
    };
  } catch {
    return { balance: 0, savings: 0, spent: 0 };
  }
}

export default function MainPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [data, setData] = useState<MoneyData>({ balance: 0, savings: 0, spent: 0 });

  useEffect(() => {
    const name = localStorage.getItem("userName") || "";
    if (!name) {
      router.push("/");
      return;
    }
    setUserName(name);
    setData(readMoneyData(name));
  }, [router]);

  const greeting = useMemo(() => {
    if (!userName) return "Welcome";
    return `Welcome, ${userName}`;
  }, [userName]);

  const logout = () => {
    localStorage.removeItem("userName");
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#EAF2FF] to-[#CFE3FF] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-[2rem] bg-white shadow-2xl shadow-black/10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A]">{greeting}</h1>
              <p className="mt-1 text-sm text-[#475569]">
                Clear overview. Big buttons. Simple actions.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-2xl bg-[#F1F5F9] px-4 py-3 text-sm font-semibold text-[#0F172A] hover:bg-[#E2E8F0] focus:outline-none focus:ring-4 focus:ring-black/10"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black/10 bg-[#F8FAFC] p-5">
              <div className="text-sm font-semibold text-[#475569]">Balance</div>
              <div className="mt-2 text-2xl font-extrabold text-[#0F172A]">€{data.balance.toFixed(2)}</div>
              <div className="mt-3 inline-flex rounded-xl bg-[#DCFCE7] px-3 py-2 text-sm font-semibold text-[#166534]">
                Safe (green)
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-[#F8FAFC] p-5">
              <div className="text-sm font-semibold text-[#475569]">Savings</div>
              <div className="mt-2 text-2xl font-extrabold text-[#0F172A]">€{data.savings.toFixed(2)}</div>
              <div className="mt-3 inline-flex rounded-xl bg-[#DBEAFE] px-3 py-2 text-sm font-semibold text-[#1D4ED8]">
                Goals (blue)
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-[#F8FAFC] p-5">
              <div className="text-sm font-semibold text-[#475569]">Spent</div>
              <div className="mt-2 text-2xl font-extrabold text-[#0F172A]">€{data.spent.toFixed(2)}</div>
              <div className="mt-3 inline-flex rounded-xl bg-[#FEE2E2] px-3 py-2 text-sm font-semibold text-[#991B1B]">
                Watch (red)
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/balance"
              className="rounded-2xl bg-[#2563EB] text-white text-center py-4 font-semibold hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-black/10"
            >
              Update Balance
            </Link>

            <Link
              href="/savings"
              className="rounded-2xl bg-[#0EA5E9] text-white text-center py-4 font-semibold hover:bg-[#0284C7] focus:outline-none focus:ring-4 focus:ring-black/10"
            >
              Add to Savings
            </Link>

            <Link
              href="/spent"
              className="rounded-2xl bg-[#F97316] text-white text-center py-4 font-semibold hover:bg-[#EA580C] focus:outline-none focus:ring-4 focus:ring-black/10"
            >
              Log Spending
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-[#F8FAFC] p-5">
            <div className="text-sm font-semibold text-[#0F172A]">Next step</div>
            <p className="mt-1 text-sm text-[#475569]">
              We’ll replace this with your “Quick Transaction” + “Recent Activity” once the theme is locked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}