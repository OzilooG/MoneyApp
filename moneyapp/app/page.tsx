"use client";

import { useState } from "react";

export default function MoneyAppMainPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");

  const value = Number(amount) || 0;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            My Balance
          </h1>
          <p className="text-4xl font-bold mt-2 text-gray-900">
            €{balance.toFixed(2)}
          </p>
        </div>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
        />

        <div className="grid grid-cols-2 gap-4">
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
            onClick={() => {
              setBalance(balance + value);
              setAmount("");
            }}
          >
            Add
          </button>

          <button
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition"
            onClick={() => {
              setBalance(balance - value);
              setAmount("");
            }}
          >
            Subtract
          </button>
        </div>
      </div>
    </div>
  );
}
