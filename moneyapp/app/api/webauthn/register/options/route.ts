// FILE: app/api/webauthn/register/options/route.ts
//
// Generates WebAuthn registration options for Face ID / Touch ID setup.
// Input:  POST { userName: string }
// Output: PublicKeyCredentialCreationOptionsJSON

import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { ensureUser, upsertUser } from "@/lib/webauthnStore";

export const runtime = "nodejs";

// Decodes a base64url string → Uint8Array.
// Used for excludeCredentials[].id — SimpleWebAuthn v13 requires bytes, not strings.
function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  return new Uint8Array(Buffer.from(base64 + pad, "base64"));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userName = String(body?.userName ?? "").trim();

  if (!userName) {
    return NextResponse.json({ error: "userName is required" }, { status: 400 });
  }

  const rpID   = process.env.RP_ID   ?? "localhost";
  const rpName = process.env.RP_NAME ?? "MoneyApp";

  const user = ensureUser(userName);

  // v13 REQUIRES userID to be Uint8Array bytes — string values throw at runtime.
  const userID = new TextEncoder().encode(user.id);

  // Build excludeCredentials — tells the authenticator to skip already-registered creds.
  // Always pass the array (even if empty) to avoid the TS spread-union inference bug
  // that underlines every other param when you use: ...(arr.length ? { excludeCredentials } : {})
  const excludeCredentials = user.credentials.map((c) => ({
    id: base64urlToBytes(c.credentialID),
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
    supportedAlgorithmIDs: [-7, -257], // ES256 (passkeys) + RS256 (legacy platform auth)
    // Pass array directly — empty array is valid and avoids the TS spread issue
    excludeCredentials,
  });

  // Store challenge so /register/verify can confirm it
  user.currentChallenge = options.challenge;
  upsertUser(user);

  return NextResponse.json(options);
}