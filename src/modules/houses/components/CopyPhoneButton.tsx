"use client";

import { useState } from "react";

import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

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
    <PubButton
      type="button"
      variant={copied ? "accent-soft" : "secondary"}
      size="sm"
      onClick={handleCopy}
      leftIcon={<PubIcon name={copied ? "check" : "copy"} className="h-4 w-4" />}
    >
      {copied ? "Скопійовано" : "Копіювати телефон"}
    </PubButton>
  );
}
