"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RETURN_KEY = "house-chairman-return";
const CHAIRMAN_PATH_PATTERN = /^\/house\/[a-z0-9-]+\/chairman$/i;

export function ChairmanReturnRedirect() {
  const router = useRouter();

  useEffect(() => {
    const returnPath = window.sessionStorage.getItem(RETURN_KEY);

    if (!returnPath) {
      return;
    }

    window.sessionStorage.removeItem(RETURN_KEY);

    if (!CHAIRMAN_PATH_PATTERN.test(returnPath)) {
      return;
    }

    router.replace(returnPath);
  }, [router]);

  return null;
}
