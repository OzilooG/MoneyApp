// FILE: app/api/webauthn/auth/verify/route.ts

import { NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type WebAuthnCredential,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { getUserByName, upsertUser } from "@/lib/webauthnStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body              = await req.json().catch(() => ({}));
  const userName          = String(body?.userName ?? "").trim();
  const assertionResponse = body?.assertionResponse as AuthenticationResponseJSON | undefined;

  if (!userName || !assertionResponse) {
    return NextResponse.json(
      { verified: false, error: "userName and assertionResponse are required" },
      { status: 400 }
    );
  }

  const rpID           = process.env.RP_ID ?? "localhost";
  const expectedOrigin = req.headers.get("origin") ?? "http://localhost:3000";

  const user = getUserByName(userName);
  if (!user?.currentAuthChallenge) {
    return NextResponse.json(
      { verified: false, error: "No stored challenge. Try Face ID again." },
      { status: 400 }
    );
  }

  const stored = user.credentials.find((c) => c.credentialID === assertionResponse.id);
  if (!stored) {
    return NextResponse.json(
      { verified: false, error: "Credential not found for this user." },
      { status: 400 }
    );
  }

  // Explicitly type as WebAuthnCredential so TS resolves all field names correctly.
  // Buffer.from with "base64url" encoding handles the base64url string directly —
  // no manual replace() needed. Uint8Array.from() produces a clean Uint8Array (not Buffer).
  const credential: WebAuthnCredential = {
    id:         stored.credentialID,
    publicKey:  Uint8Array.from(Buffer.from(stored.publicKey, "base64url")),
    counter:    stored.counter,
    transports: (stored.transports ?? []) as AuthenticatorTransportFuture[],
  };

  try {
    const verification = await verifyAuthenticationResponse({
      response:          assertionResponse,
      expectedChallenge: user.currentAuthChallenge,
      expectedOrigin,
      expectedRPID:      rpID,
      credential,
    });

    if (!verification.verified) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    stored.counter            = verification.authenticationInfo.newCounter;
    user.currentAuthChallenge = undefined;
    upsertUser(user);

    return NextResponse.json({ verified: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ verified: false, error: message }, { status: 400 });
  }
}