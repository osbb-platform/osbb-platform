"use client";

import { useState } from "react";

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
      window.alert(`Не вдалося скопіювати номер. Скопіюйте вручну: ${phone}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {copied ? "Номер скопійовано" : "Зателефонувати"}
    </button>
  );
}
