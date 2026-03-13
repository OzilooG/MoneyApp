import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { getUserByName, upsertUser } from "@/lib/webauthnStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userName = String(body?.userName ?? "").trim();

    if (!userName) {
      return NextResponse.json({ error: "userName is required" }, { status: 400 });
    }

    const user = await getUserByName(userName);

    console.log("[auth/options] fetched user:", JSON.stringify(user ?? null));

    if (!user || user.credentials.length === 0) {
      return NextResponse.json(
        { error: "No Face ID credentials found. Register Face ID first." },
        { status: 400 }
      );
    }

    const rpID = process.env.RP_ID ?? "localhost";

    const validCredentials = user.credentials.filter((c) => {
      const valid =
        typeof c.credentialID === "string" && c.credentialID.length > 0;

      if (!valid) {
        console.error("[auth/options] malformed credential:", JSON.stringify(c));
      }

      return valid;
    });

    if (validCredentials.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid Face ID credentials found. Please delete this account and register again.",
        },
        { status: 400 }
      );
    }

    const allowCredentials = validCredentials.map((c) => ({
      id: c.credentialID,
      type: "public-key" as const,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    user.currentAuthChallenge = options.challenge;

    console.log("[auth/options] saving challenge:", options.challenge);

    await upsertUser(user);

    const savedUser = await getUserByName(userName);
    console.log(
      "[auth/options] saved user after upsert:",
      JSON.stringify(savedUser ?? null)
    );

    return NextResponse.json(options);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/options] CRASH:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}