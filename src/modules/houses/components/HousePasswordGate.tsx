"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { loginToHouse } from "@/src/modules/houses/actions/loginToHouse";
import { PubButton } from "@/src/shared/ui/public";

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
}: HousePasswordGateProps) {
  const [state, formAction, isPending] = useActionState(
    loginToHouse,
    initialState,
  );
  const pathname = usePathname();
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
    if (pathname === `/house/${slug}/chairman`) {
      window.sessionStorage.setItem(
        "house-chairman-return",
        `/house/${slug}/chairman`,
      );
    }

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
      "h-14 w-11 rounded-[var(--r-lg)] border-2 bg-[var(--pub-surface-elevated)] text-center font-[var(--font-serif)] text-[2rem] font-semibold leading-none text-[var(--pub-text)] outline-none transition-all duration-200 sm:h-16 sm:w-12 lg:h-[72px] lg:w-[56px]";

    if (state.error) {
      return `${baseClassName} border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)]`;
    }

    const isFilled = Boolean(digits[index]);
    const isActive = activeIndex === index;
    const isNextTarget = !isFilled && nextEmptyIndex === index;

    if (isActive) {
      return `${baseClassName} border-[var(--pub-accent)] shadow-[0_0_0_3px_var(--pub-accent-soft)]`;
    }

    if (isNextTarget) {
      return `${baseClassName} border-[var(--pub-accent-border)] shadow-[0_0_0_1px_var(--pub-accent-soft)]`;
    }

    if (isFilled) {
      return `${baseClassName} border-[var(--pub-accent-border)] bg-[var(--pub-accent-tint)]`;
    }

    return `${baseClassName} border-[var(--pub-border-strong)] hover:border-[var(--pub-accent-border)]`;
  }

  return (
    <main className="min-h-screen bg-[var(--pub-bg)] text-[var(--pub-text)]">
      <section className="mx-auto flex min-h-screen max-w-[1280px] items-center px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="grid w-full gap-4 xl:grid-cols-[1.06fr_0.94fr] xl:gap-5">
          <div className="relative min-h-[300px] overflow-hidden rounded-[var(--r-3xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] xl:min-h-[calc(100vh-3rem)]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${houseImageUrl}")` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--pub-overlay)] via-black/10 to-black/5" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6 lg:p-8">
              <div>
                <div className="inline-flex rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]">
                  {districtName ?? houseCopy.common.houseFallback}
                </div>
              </div>

              <div className="hidden w-full rounded-[var(--r-2xl)] border border-white/12 bg-gradient-to-br from-black/55 via-black/35 to-black/20 p-5 text-white shadow-[var(--pub-shadow-lg)] backdrop-blur-[3px] sm:block sm:p-6 lg:p-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/72">
                  {houseCopy.passwordGate.heroBadge}
                </div>
                <div className="mt-3 font-[var(--font-serif)] text-2xl font-semibold leading-[1.18] sm:text-3xl lg:text-[2.4rem]">
                  {houseCopy.passwordGate.heroTitle}
                </div>
                <div className="mt-3 text-base leading-7 text-white/90 lg:text-[16px]">
                  {houseCopy.passwordGate.heroDescription}
                </div>
              </div>
            </div>
          </div>

          <div className="flex rounded-[var(--r-3xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-lg)] sm:p-6 lg:p-8 xl:min-h-[calc(100vh-3rem)]">
            <div className="flex w-full flex-col justify-between">
              <div>
                <header>
                  <div className="font-[var(--font-serif)] text-[clamp(2.4rem,4vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-[var(--pub-text)]">
                    {houseCopy.passwordGate.cabinetTitle}
                  </div>

                  <div className="mt-3 text-[clamp(1.25rem,2vw,1.7rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--pub-text)]">
                    {houseName}
                  </div>

                  <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
                      {houseCopy.passwordGate.address}
                    </div>
                    <div className="mt-2 text-base font-medium leading-7 text-[var(--pub-text)] lg:text-[1.1rem]">
                      {houseAddress}
                    </div>
                  </div>
                </header>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
                      {houseCopy.passwordGate.access}
                    </div>
                    <div className="mt-2 text-[15px] font-medium leading-7 text-[var(--pub-text)]">
                      {houseCopy.passwordGate.accessDescription}
                    </div>
                  </div>

                  <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
                      {houseCopy.passwordGate.loginFormat}
                    </div>
                    <div className="mt-2 text-[15px] font-medium leading-7 text-[var(--pub-text)]">
                      {houseCopy.passwordGate.loginFormatDescription}
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-base leading-7 text-[var(--pub-text-muted)] lg:text-[1.02rem]">
                  {description}
                </p>

                <form action={handleSubmit} className="mt-6">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="accessCode" value={normalizeDigits(code)} />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold leading-tight text-[var(--pub-text)]">
                        {houseCopy.passwordGate.enterCode}
                      </div>
                      <div className="mt-2 text-[15px] leading-6 text-[var(--pub-text-muted)]">
                        {houseCopy.passwordGate.enterCodeHint}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-[var(--r-pill)] border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-4 py-2 text-sm font-semibold text-[var(--pub-text-muted)]">
                      {normalizeDigits(code).length} / 6
                    </div>
                  </div>

                  <div
                    className={`mt-5 flex flex-wrap gap-2.5 sm:gap-3 ${state.error ? "pub-code-shake" : ""}`}
                  >
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
                      <div className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-5 py-4 text-[15px] leading-7 text-[var(--pub-danger-text)]">
                        {isLocked
                          ? `З міркувань безпеки вхід тимчасово призупинено. Залишилось ${Math.floor(lockRemaining / 60000)}:${String(Math.floor((lockRemaining % 60000) / 1000)).padStart(2, "0")}`
                          : uiMessage}
                      </div>
                    ) : (
                      <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4 text-[15px] leading-7 text-[var(--pub-text-muted)]">
                        Немає коду доступу або він не підходить? Зверніться до
                        керуючої компанії вашого будинку.
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <PubButton
                      type="submit"
                      disabled={isButtonDisabled || isLocked}
                      loading={isPending}
                      fullWidth
                      size="lg"
                    >
                      {isPending ? "Перевіряємо код..." : "Увійти до кабінету"}
                    </PubButton>
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
