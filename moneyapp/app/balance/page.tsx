"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The Balance page has been removed.
// This redirect ensures any old links to /balance go to /main instead.

export default function BalanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/main");
  }, [router]);

  return null;
}