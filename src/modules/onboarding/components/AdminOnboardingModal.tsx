"use client";

import { useState } from "react";
import { ADMIN_ONBOARDING_STEPS } from "../config/adminOnboardingSteps";

type Props = {
  onClose: () => void;
};

export function AdminOnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState(0);

  const current = ADMIN_ONBOARDING_STEPS[step];
  const isLast = step === ADMIN_ONBOARDING_STEPS.length - 1;

  function next() {
    if (isLast) {
      onClose();
      return;
    }
    setStep((s) => s + 1);
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6">
        
        {/* Skip */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-sm text-slate-400 hover:text-white"
        >
          Пропустити
        </button>

        <h2 className="text-xl font-semibold text-white">
          {current.title}
        </h2>

        <p className="mt-4 text-sm leading-6 text-slate-300 whitespace-pre-line">
          {current.description}
        </p>

        {/* Progress */}
        <div className="mt-6 flex justify-center gap-2">
          {ADMIN_ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === step ? "bg-white" : "bg-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="text-sm text-slate-400 disabled:opacity-30"
          >
            ← Назад
          </button>

          <button
            onClick={next}
            className="rounded-2xl bg-white px-5 py-2 text-sm font-medium text-slate-950"
          >
            {isLast ? "Перейти в дашборд" : "Далі →"}
          </button>
        </div>
      </div>
    </div>
  );
}
