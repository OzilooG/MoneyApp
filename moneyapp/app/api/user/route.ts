import { NextRequest, NextResponse } from "next/server";
import { getUserByName } from "@/lib/webauthnStore";
import { MongoClient } from "mongodb";

async function getDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set");
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(process.env.MONGODB_URI);
    await global.__mongoClient.connect();
  }
  return global.__mongoClient.db("moneyapp");
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const user = await getUserByName(name);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ userId: user.id });
  } catch (err) {
    console.error("[/api/user GET] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const db = await getDb();
    await db.collection("users").deleteOne({ name });
    await db.collection("financialData").deleteOne({ userName: name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/user DELETE] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
