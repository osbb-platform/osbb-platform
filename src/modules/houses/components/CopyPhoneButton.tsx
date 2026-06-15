"use client";

import { useState } from "react";
import { useToast } from "@/src/shared/ui/toast/ToastProvider";

type Props = {
  phone: string;
};

export function CopyPhoneButton({ phone }: Props) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      toast({
        tone: "error",
        title: "Не вдалося скопіювати номер",
        description: `Скопіюйте вручну: ${phone}`,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-[#D2C6B8] bg-[#E7DED3] px-4 py-2 text-sm font-medium text-[#1F2A37] transition hover:bg-[#DDD1C3]"
    >
      {copied ? "Номер скопійовано" : "Копіювати номер"}
    </button>
  );
}
