import { MongoClient, type Collection } from "mongodb";
import type { UserData } from "./moneyData";

export type FinanceDocument = Omit<UserData, "pin"> & {
  userId:    string;
  userName:  string;
  updatedAt: Date;
};

declare global {
  var __mongoClient: MongoClient | undefined;
}

async function getCollection(): Promise<Collection<FinanceDocument>> {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set");
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(process.env.MONGODB_URI);
    await global.__mongoClient.connect();
  }
  return global.__mongoClient.db("moneyapp").collection<FinanceDocument>("financialData");
}

export async function getFinanceData(userId: string): Promise<FinanceDocument | null> {
  const col = await getCollection();
  const doc = await col.findOne({ userId });
  if (!doc) return null;
  const { _id, ...rest } = doc as FinanceDocument & { _id: unknown };
  void _id;
  return rest as FinanceDocument;
}

export async function saveFinanceData(userId: string, userName: string, data: Omit<UserData, "pin">): Promise<void> {
  const col = await getCollection();
  const doc: FinanceDocument = { ...data, userId, userName, updatedAt: new Date() };
  await col.updateOne({ userId }, { $set: doc }, { upsert: true });
}
