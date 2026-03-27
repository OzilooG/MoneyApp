// lib/moneyData.ts
// Shared data layer for MoneyApp.
// All pages read and write user financial data through these helpers.
// Auth fields (pin) are always preserved and never touched here.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType = "add" | "subtract";

export type Transaction = {
  id: number;        // Date.now() at time of creation
  type: TransactionType;
  amount: number;
  category: string;  // e.g. "Income", "Food", "Transport", "Other"
  note: string;      // short optional description, defaults to ""
  date: string;      // ISO date string
};

export type UserData = {
  // Auth — read-only here, never overwritten
  pin?: string;

  // Starting balance set by user on first login
  balance: number;

  // Flag — true once user has set their starting balance
  // Used to control whether the setup popup shows
  hasSetBalance: boolean;

  // Savings — managed by /savings
  savings: number;
  savingsGoal: number;

  // All income + expense transactions — single source of truth
  transactions: Transaction[];

  // Monthly spending limit — managed by /spent
  budget: number;
};

// ─── Safe defaults ────────────────────────────────────────────────────────────

const DEFAULT_DATA: Omit<UserData, "pin"> = {
  balance:       0,
  hasSetBalance: false,
  savings:       0,
  savingsGoal:   0,
  transactions:  [],
  budget:        0,
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getUserData(userName: string): UserData {
  if (typeof window === "undefined") return { ...DEFAULT_DATA };

  const raw = localStorage.getItem(`user-${userName}`);
  if (!raw) return { ...DEFAULT_DATA };

  let parsed: Partial<UserData> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DATA };
  }

  return {
    pin:           parsed.pin,
    balance:       Number(parsed.balance ?? 0),
    hasSetBalance: Boolean(parsed.hasSetBalance ?? false),
    savings:       Number(parsed.savings ?? 0),
    savingsGoal:   Number(parsed.savingsGoal ?? 0),
    transactions:  Array.isArray(parsed.transactions) ? parsed.transactions : [],
    budget:        Number(parsed.budget ?? 0),
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function saveUserData(userName: string, data: UserData): void {
  if (typeof window === "undefined") return;

  // Always preserve the existing pin even if not on the incoming object
  const raw = localStorage.getItem(`user-${userName}`);
  let existingPin: string | undefined;
  if (raw) {
    try { existingPin = JSON.parse(raw).pin; } catch {}
  }

  const toStore: UserData = {
    ...data,
    pin: data.pin ?? existingPin,
  };

  localStorage.setItem(`user-${userName}`, JSON.stringify(toStore));
}

// ─── Derive helpers ───────────────────────────────────────────────────────────

/** Total income = sum of all "add" transactions */
export function deriveIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "add")
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Total spent = sum of all "subtract" transactions */
export function deriveSpent(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "subtract")
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Current running balance = starting balance + income - spent
 * This is the live balance shown on the dashboard.
 */
export function deriveCurrentBalance(
  startingBalance: number,
  transactions: Transaction[]
): number {
  const income = deriveIncome(transactions);
  const spent  = deriveSpent(transactions);
  return startingBalance + income - spent;
}