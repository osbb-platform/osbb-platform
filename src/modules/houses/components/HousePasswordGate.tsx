"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { loginToHouse } from "@/src/modules/houses/actions/loginToHouse";

type HousePasswordGateProps = {
  initialLockedUntil?: number;
  slug: string;
  houseName: string;
  houseAddress: string;
  shortDescription: string | null;
  publicDescription: string | null;
  houseCoverImageUrl?: string | null;
  districtName: string | null;
  districtColor: string;
};

type LoginState = {
  error: string | null;
  lockedUntil: number | null;
};

const initialState: LoginState = {
  error: null,
  lockedUntil: null,
};

const CODE_LENGTH = 6;
const HOUSE_IMAGE_FALLBACK_URL =
  "https://images.unsplash.com/photo-1551038247-3d9af20df552?auto=format&fit=crop&w=1600&q=80";

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function HousePasswordGate({
  initialLockedUntil = 0,
  slug,
  houseName,
  houseAddress,
  shortDescription,
  publicDescription,
  houseCoverImageUrl,
  districtName,
  districtColor,
}: HousePasswordGateProps) {
  const [state, formAction, isPending] = useActionState(
    loginToHouse,
    initialState,
  );
  const [code, setCode] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const description = useMemo(() => {
    return (
      shortDescription ??
      publicDescription ??
      "Тут зібрана важлива інформація для мешканців будинку: оголошення, звіти, контакти та інші внутрішні розділи."
    );
  }, [publicDescription, shortDescription]);

  const houseImageUrl = houseCoverImageUrl ?? HOUSE_IMAGE_FALLBACK_URL;

  useEffect(() => {
    setLockRemaining(Math.max(0, initialLockedUntil - Date.now()));
  }, [initialLockedUntil]);


  useEffect(() => {
    if (!initialLockedUntil || initialLockedUntil <= Date.now()) {
      return;
    }

    setUiMessage("З міркувань безпеки вхід тимчасово призупинено.");

    const tick = () => {
      const remaining = Math.max(0, initialLockedUntil - Date.now());
      setLockRemaining(remaining);

      if (remaining === 0) {
        setUiMessage(null);

        window.setTimeout(() => {
          inputRefs.current[0]?.focus();
          inputRefs.current[0]?.select();
          setActiveIndex(0);
        }, 20);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [initialLockedUntil]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    setCode("");
    setActiveIndex(0);

    const timeoutId = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
      inputRefs.current[0]?.select();
    }, 20);

    return () => window.clearTimeout(timeoutId);
  }, [state.error]);


  const digits = Array.from(
    { length: CODE_LENGTH },
    (_, index) => code[index] ?? "",
  );
  const isCodeComplete = normalizeDigits(code).length === CODE_LENGTH;
  const isButtonDisabled = isPending || !isCodeComplete;
  const nextEmptyIndex = Math.min(code.length, CODE_LENGTH - 1);
  const isLocked = lockRemaining > 0;

  useEffect(() => {
    if (!state.error) {
      return;
    }

    setUiMessage(state.error);
    setCode("");
    setActiveIndex(0);

    const timeoutId = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
      inputRefs.current[0]?.select();
    }, 20);

    return () => window.clearTimeout(timeoutId);
  }, [state, isPending]);

  useEffect(() => {
    if (!state.lockedUntil) {
      setLockRemaining(0);
      return;
    }

    const lockedUntil = state.lockedUntil;

    const tick = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockRemaining(remaining);

      if (remaining === 0) {
        setUiMessage(null);

        window.setTimeout(() => {
          inputRefs.current[0]?.focus();
          inputRefs.current[0]?.select();
          setActiveIndex(0);
        }, 20);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [state.lockedUntil]);



  function focusInput(index: number) {
    const safeIndex = Math.max(0, Math.min(index, CODE_LENGTH - 1));
    inputRefs.current[safeIndex]?.focus();
    inputRefs.current[safeIndex]?.select();
    setActiveIndex(safeIndex);
  }

  async function handleSubmit(formData: FormData) {
    await formAction(formData);
  }

  function handleDigitChange(index: number, value: string) {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    const currentDigits = Array.from(
      { length: CODE_LENGTH },
      (_, idx) => code[idx] ?? "",
    );

    currentDigits[index] = nextDigit;

    const nextCode = currentDigits.join("").slice(0, CODE_LENGTH);
    setCode(nextCode);

    if (nextDigit && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
      return;
    }

    setActiveIndex(index);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const currentDigits = Array.from(
          { length: CODE_LENGTH },
          (_, idx) => code[idx] ?? "",
        );
        currentDigits[index] = "";
        setCode(currentDigits.join(""));
        setActiveIndex(index);
        return;
      }

      if (index > 0) {
        event.preventDefault();
        const currentDigits = Array.from(
          { length: CODE_LENGTH },
          (_, idx) => code[idx] ?? "",
        );
        currentDigits[index - 1] = "";
        setCode(currentDigits.join(""));
        focusInput(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }

    if (event.key === "Enter" && isCodeComplete && !isPending) {
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pastedValue = event.clipboardData.getData("text");
    const normalized = normalizeDigits(pastedValue);

    if (!normalized) {
      return;
    }

    setCode(normalized);

    if (normalized.length >= CODE_LENGTH) {
      focusInput(CODE_LENGTH - 1);
      return;
    }

    focusInput(normalized.length);
  }

  function getDigitClassName(index: number) {
    const baseClassName =
      "h-14 w-11 rounded-[22px] border bg-[var(--background)] text-center text-[2rem] font-semibold leading-none text-[var(--foreground)] outline-none transition-all duration-200 sm:h-16 sm:w-12 lg:h-[72px] lg:w-[56px]";

    if (state.error) {
      return `${baseClassName} border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(220,38,38,0.05)]`;
    }

    const isFilled = Boolean(digits[index]);
    const isActive = activeIndex === index;
    const isNextTarget = !isFilled && nextEmptyIndex === index;

    if (isActive) {
      return `${baseClassName} border-[var(--accent-color)] shadow-[0_0_0_3px_var(--accent-soft)]`;
    }

    if (isNextTarget) {
      return `${baseClassName} border-[var(--accent-color)]/60 shadow-[0_0_0_1px_var(--accent-soft)]`;
    }

    if (isFilled) {
      return `${baseClassName} border-[var(--accent-color)]/50 bg-white`;
    }

    return `${baseClassName} border-[var(--border)] hover:border-[var(--accent-color)]/40`;
  }

  return (
    <main
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      style={
        {
          "--accent-color": districtColor,
          "--accent-soft": `${districtColor}22`,
        } as React.CSSProperties
      }
    >
      <section className="mx-auto flex min-h-screen max-w-[1600px] items-center px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="grid w-full gap-4 xl:grid-cols-[1.06fr_0.94fr] xl:gap-6">
          <div className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-slate-200 xl:min-h-[calc(100vh-3rem)]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${houseImageUrl}")` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-slate-950/10 to-slate-900/8" />

            <div className="relative mx-auto flex h-full max-w-lg flex-col justify-between p-5 sm:p-6 lg:p-8">
              <div>
                <div
                  className="inline-flex rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-sm"
                  style={{ backgroundColor: districtColor }}
                >
                  {districtName ?? houseCopy.common.houseFallback}
                </div>
              </div>

              <div className="hidden sm:block max-w-lg rounded-[26px] border border-white/12 bg-white/8 p-4 text-white backdrop-blur-md sm:p-5 lg:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                  {houseCopy.passwordGate.heroBadge}
                </div>
                <div className="mt-3 text-xl font-semibold leading-tight sm:text-2xl lg:text-[2rem]">
                  {houseCopy.passwordGate.heroTitle}
                </div>
                <div className="mt-3 text-sm leading-6 text-white/88 lg:text-[15px]">
                  {houseCopy.passwordGate.heroDescription}
                </div>
              </div>
            </div>
          </div>

          <div className="flex rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6 lg:p-8 xl:min-h-[calc(100vh-3rem)]">
            <div className="flex w-full flex-col justify-between">
              <div>
                <header>
                  <div className="text-[clamp(2.5rem,4vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-[#111318]">
                    {houseCopy.passwordGate.cabinetTitle}
                  </div>

                  <div className="mt-3 text-[clamp(1.35rem,2vw,2rem)] font-semibold leading-tight tracking-[-0.03em] text-[#111318]">
                    {houseName}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-[#d7d9df] bg-[#f4f5f8] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7280]">
                      {houseCopy.passwordGate.address}
                    </div>
                    <div className="mt-2 text-base font-medium leading-7 text-[#1a1d24] lg:text-[1.15rem]">
                      {houseAddress}
                    </div>
                  </div>
                </header>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-[#d7d9df] bg-[#f6f7fa] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7280]">
                      {houseCopy.passwordGate.access}
                    </div>
                    <div className="mt-2 text-[15px] font-medium leading-7 text-[#1a1d24]">
                      {houseCopy.passwordGate.accessDescription}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#d7d9df] bg-[#f6f7fa] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7280]">
                      {houseCopy.passwordGate.loginFormat}
                    </div>
                    <div className="mt-2 text-[15px] font-medium leading-7 text-[#1a1d24]">
                      {houseCopy.passwordGate.loginFormatDescription}
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-base leading-7 text-[#535866] lg:text-[1.02rem]">
                  {description}
                </p>

                <form action={handleSubmit} className="mt-6">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="accessCode" value={normalizeDigits(code)} />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold leading-tight text-[#171a21]">
                        {houseCopy.passwordGate.enterCode}
                      </div>
                      <div className="mt-2 text-[15px] leading-6 text-[#666b78]">
                        {houseCopy.passwordGate.enterCodeHint}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-[#d3d5dc] px-4 py-2 text-sm font-semibold text-[#6d7280]">
                      {normalizeDigits(code).length} / 6
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(node) => {
                          inputRefs.current[index] = node;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(event) =>
                          handleDigitChange(index, event.target.value)
                        }
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        onPaste={handlePaste}
                        onFocus={(event) => {
                          setActiveIndex(index);
                          event.currentTarget.select();
                        }}
                        onClick={() => setActiveIndex(index)}
                        className={getDigitClassName(index)}
                        disabled={isLocked}
                        aria-label={`Цифра ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="mt-5">
                    {uiMessage ? (
                      <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] leading-7 text-red-700">
                        {isLocked
                          ? `З міркувань безпеки вхід тимчасово призупинено. Осталось ${Math.floor(lockRemaining / 60000)}:${String(Math.floor((lockRemaining % 60000) / 1000)).padStart(2, "0")}`
                          : uiMessage}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-[#d7d9df] bg-[#f4f5f8] px-5 py-4 text-[15px] leading-7 text-[#5e6370]">
                        Немає коду доступу або він не підходить? Зверніться до
                        керуючої компанії вашого будинку.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button
                      type="submit"
                      disabled={isButtonDisabled || isLocked}
                      className="inline-flex min-w-[260px] items-center justify-center rounded-[24px] px-6 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:opacity-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:text-[#7b8190] disabled:opacity-100"
                      style={
                        isPending || !isCodeComplete
                          ? undefined
                          : { backgroundColor: districtColor }
                      }
                    >
                      {isPending ? "Перевіряємо код..." : "Увійти до кабінету"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
