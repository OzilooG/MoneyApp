// FILE: lib/webauthnStore.ts
//
// File-backed credential store.
//
// WHY: The in-memory Map (even with global.__webauthnStore) resets whenever
// Next.js fully restarts the Node process (e.g. after changing a route file,
// or just running `npm run dev` fresh). That means registered credentials
// disappear and Face ID login always fails with "Could not start Face ID."
//
// FIX: We persist the store to a JSON file at `.webauthn-store.json` in the
// project root. Reads happen on every request; writes happen after mutations.
// This is fine for dev — replace with a real DB (SQLite/Postgres) for prod.

import fs   from "fs";
import path from "path";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoredCredential = {
  credentialID: string;
  publicKey:    string;
  counter:      number;
  transports?:  AuthenticatorTransportFuture[];
};

export type StoredUser = {
  id:                   string;
  name:                 string;
  currentChallenge?:     string;
  currentAuthChallenge?: string;
  credentials:          StoredCredential[];
};

// ─── File path ────────────────────────────────────────────────────────────────

// Stored at project root — gitignore this file in production!
const STORE_PATH = path.join(process.cwd(), ".webauthn-store.json");

// ─── Read / Write ─────────────────────────────────────────────────────────────

function readStore(): Map<string, StoredUser> {
  try {
    if (!fs.existsSync(STORE_PATH)) return new Map();
    const raw  = fs.readFileSync(STORE_PATH, "utf-8");
    const data = JSON.parse(raw) as Record<string, StoredUser>;
    return new Map(Object.entries(data));
  } catch {
    // If the file is corrupted, start fresh
    return new Map();
  }
}

function writeStore(map: Map<string, StoredUser>): void {
  try {
    const obj = Object.fromEntries(map.entries());
    fs.writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.error("[webauthnStore] Failed to write store:", e);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getUserByName(name: string): StoredUser | undefined {
  return readStore().get(name);
}

export function upsertUser(user: StoredUser): void {
  const map = readStore();
  map.set(user.name, user);
  writeStore(map);
}

export function ensureUser(name: string): StoredUser {
  const map      = readStore();
  const existing = map.get(name);
  if (existing) return existing;

  const created: StoredUser = {
    id:          crypto.randomUUID(),
    name,
    credentials: [],
  };
  map.set(name, created);
  writeStore(map);
  return created;
}