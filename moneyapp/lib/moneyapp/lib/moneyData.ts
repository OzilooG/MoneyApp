// lib/moneyData.ts
// Shared data layer for MoneyApp.

export type TransactionType = "add" | "subtract";

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

export type Balances = {
  cash: number;
  bank: number;
  postoffice: number;
};

export type UserData = {
  pin?: string;

  balances: Balances;
  balance: number;

  savings: number;
  savingsGoal: number;

  transactions: Transaction[];

  budget: number;
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_DATA: Omit<UserData, "pin"> = {
  balances: {
    cash: 0,
    bank: 0,
    postoffice: 0,
  },
  balance: 0,
  savings: 0,
  savingsGoal: 0,
  transactions: [],
  budget: 0,
};

// ─── Read ────────────────────────────────────────────────────────────────────

export function getUserData(userName: string): UserData {
  if (typeof window === "undefined") {
    return { ...DEFAULT_DATA, pin: undefined };
  }

  const raw = localStorage.getItem(`user-${userName}`);

  if (!raw) {
    return { ...DEFAULT_DATA, pin: undefined };
  }

  let parsed: Partial<UserData> = {};

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DATA, pin: undefined };
  }

  const balances: Balances = {
    cash: Number(parsed.balances?.cash ?? 0),
    bank: Number(parsed.balances?.bank ?? 0),
    postoffice: Number(parsed.balances?.postoffice ?? 0),
  };

  const transactions: Transaction[] = Array.isArray(parsed.transactions)
    ? parsed.transactions.map((t: any) => ({
        id: Number(t.id),
        type: t.type,
        amount: Number(t.amount),
        category: t.category ?? "Other",
        note: t.note ?? "",
        date: t.date ?? new Date().toISOString(),
      }))
    : [];

  return {
    pin: parsed.pin,
    balances,
    balance: deriveBalance(balances),
    savings: Number(parsed.savings ?? 0),
    savingsGoal: Number(parsed.savingsGoal ?? 0),
    transactions,
    budget: Number(parsed.budget ?? 0),
  };
}

// ─── Write ───────────────────────────────────────────────────────────────────

export function saveUserData(userName: string, data: UserData): void {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(`user-${userName}`);
  let existingPin: string | undefined = undefined;

  if (raw) {
    try {
      const existing = JSON.parse(raw);
      existingPin = existing.pin;
    } catch {}
  }

  const balance = deriveBalance(data.balances);

  const toStore: UserData = {
    ...data,
    balance,
    pin: data.pin ?? existingPin,
  };

  localStorage.setItem(`user-${userName}`, JSON.stringify(toStore));
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

export function deriveIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "add")
    .reduce((total, t) => total + t.amount, 0);
}

export function deriveSpent(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "subtract")
    .reduce((total, t) => total + t.amount, 0);
}

export function deriveBalance(balances: Balances): number {
  return balances.cash + balances.bank + balances.postoffice;
}