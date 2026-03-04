// FILE: app/api/webauthn/register/verify/route.ts
//
// KEY FIX: We store attestationResponse.id as the credentialID.
// This is the base64url string that comes directly from the browser —
// it is GUARANTEED to be a plain string.
//
// Previously we used credential.id from registrationInfo which TypeScript
// required an `as unknown as string` cast — meaning it wasn't actually
// typed as a string. When serialised to the JSON file it became a broken
// object like {"0":28,"1":46,...} causing auth/options to crash with
// "input.replace is not a function".
//
// attestationResponse.id and registrationInfo.credential.id refer to the
// same credential — they are identical values. Using the browser-supplied
// one avoids any type ambiguity entirely.

import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { getUserByName, upsertUser } from "@/lib/webauthnStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body                = await req.json().catch(() => ({}));
  const userName            = String(body?.userName ?? "").trim();
  const attestationResponse = body?.attestationResponse as RegistrationResponseJSON | undefined;

  if (!userName || !attestationResponse) {
    return NextResponse.json(
      { verified: false, error: "userName and attestationResponse are required" },
      { status: 400 }
    );
  }

  const rpID           = process.env.RP_ID ?? "localhost";
  const expectedOrigin = req.headers.get("origin") ?? "http://localhost:3000";

  const user = getUserByName(userName);
  if (!user?.currentChallenge) {
    return NextResponse.json(
      { verified: false, error: "No stored challenge. Restart Face ID setup." },
      { status: 400 }
    );
  }

  try {
    const verification = await verifyRegistrationResponse({
      response:          attestationResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID:      rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    const { credential } = verification.registrationInfo;

    user.credentials.push({
      // Use attestationResponse.id — the base64url string from the browser.
      // This is the same value as credential.id but is guaranteed to be a
      // plain string with no type ambiguity.
      credentialID: attestationResponse.id,

      // publicKey is always Uint8Array in v13 — convert to base64url for storage
      publicKey:    Buffer.from(credential.publicKey).toString("base64url"),

      counter:      credential.counter,
      transports:   attestationResponse.response.transports as
                      AuthenticatorTransportFuture[] | undefined,
    });

    user.currentChallenge = undefined;
    upsertUser(user);

    return NextResponse.json({ verified: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ verified: false, error: message }, { status: 400 });
  }
}