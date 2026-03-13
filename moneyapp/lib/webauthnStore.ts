// FILE: lib/webauthnStore.ts

import { MongoClient, type Collection } from "mongodb";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export type StoredCredential = {
  credentialID: string;
  publicKey:    string;
  counter:      number;
  transports?:  AuthenticatorTransportFuture[];
};

export type StoredUser = {
  id:                    string;
  name:                  string;
  currentChallenge?:     string;
  currentAuthChallenge?: string;
  credentials:           StoredCredential[];
};

declare global {
  var __mongoClient: MongoClient | undefined;
}

async function getCollection(): Promise<Collection<StoredUser>> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(process.env.MONGODB_URI);
    await global.__mongoClient.connect();
  }
  return global.__mongoClient.db("moneyapp").collection<StoredUser>("users");
}

// MongoDB adds _id to returned documents — strip it so $set never tries to update it
function stripMongoId(doc: Record<string, unknown>): StoredUser {
  const { _id, ...rest } = doc;
  void _id;
  return rest as StoredUser;
}

export async function getUserByName(name: string): Promise<StoredUser | undefined> {
  const col  = await getCollection();
  const user = await col.findOne({ name });
  return user ? stripMongoId(user as unknown as Record<string, unknown>) : undefined;
}

export async function upsertUser(user: StoredUser): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { name: user.name },
    { $set: user },
    { upsert: true }
  );
}

export async function ensureUser(name: string): Promise<StoredUser> {
  const col      = await getCollection();
  const existing = await col.findOne({ name });
  if (existing) return stripMongoId(existing as unknown as Record<string, unknown>);

  const created: StoredUser = {
    id:          crypto.randomUUID(),
    name,
    credentials: [],
  };
  await col.insertOne({ ...created });
  return created;
}