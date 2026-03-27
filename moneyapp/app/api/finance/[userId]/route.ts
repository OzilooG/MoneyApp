import { NextRequest, NextResponse } from "next/server";
import { getFinanceData, saveFinanceData } from "@/lib/financeStore";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  try {
    const data = await getFinanceData(userId);
    return NextResponse.json(data ?? null, { status: 200 });
  } catch (err) {
    console.error("[GET /api/finance] Error:", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  try {
    const body = await req.json();
    const { userName, ...data } = body;
    if (!userName) return NextResponse.json({ error: "userName is required" }, { status: 400 });
    await saveFinanceData(userId, userName, data);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/finance] Error:", err);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
