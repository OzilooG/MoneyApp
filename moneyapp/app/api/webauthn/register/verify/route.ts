// FILE: app/api/webauthn/register/verify/route.ts

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

  // ✅ await added
  const user = await getUserByName(userName);

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
      credentialID: attestationResponse.id,
      publicKey:    Buffer.from(credential.publicKey).toString("base64url"),
      counter:      credential.counter,
      transports:   attestationResponse.response.transports as
                      AuthenticatorTransportFuture[] | undefined,
    });

    user.currentChallenge = undefined;

    // ✅ await added
    await upsertUser(user);

    return NextResponse.json({ verified: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ verified: false, error: message }, { status: 400 });
  }
}