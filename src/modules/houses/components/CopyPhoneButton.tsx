"use client";

import { useState } from "react";

import { Button } from "@/src/shared/ui/admin/Button";

type Props = {
  phone: string;
};

export function CopyPhoneButton({ phone }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={copied ? "success" : "secondary"}
      size="sm"
      onClick={handleCopy}
    >
      {copied ? "Скопійовано" : "Копіювати телефон"}
    </Button>
  );
}
