// FILE: app/api/webauthn/register/options/route.ts

import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { ensureUser, upsertUser } from "@/lib/webauthnStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userName = String(body?.userName ?? "").trim();

  if (!userName) {
    return NextResponse.json({ error: "userName is required" }, { status: 400 });
  }

  const rpID = process.env.RP_ID ?? "localhost";
  const rpName = process.env.RP_NAME ?? "MoneyApp";

  const user = await ensureUser(userName);
  const userID = new TextEncoder().encode(user.id);

  const excludeCredentials = user.credentials.map((c) => ({
    id: c.credentialID,
    type: "public-key" as const,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID,
    userName: user.name,
    userDisplayName: user.name,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials,
  });

  user.currentChallenge = options.challenge;
  await upsertUser(user);

  return NextResponse.json(options);
}