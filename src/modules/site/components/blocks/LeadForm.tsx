"use client";

import { useActionState, useState } from "react";

import {
  submitSiteLead,
  type SubmitSiteLeadState,
} from "@/src/modules/site/actions/submitSiteLead";

const roles = [
  { label: "Голова ОСББ", value: "head" },
  { label: "Член правління", value: "board_member" },
  { label: "Управляюча компанія", value: "manager" },
  { label: "Мешканець", value: "resident" },
  { label: "Інше", value: "other" },
] as const;

const initialSubmitSiteLeadState = {
  ok: false,
  error: null,
  successMessage: null,
  fieldErrors: {},
  retryAfterSeconds: null,
} satisfies SubmitSiteLeadState;

export function LeadForm() {
  const [formStartedAt] = useState(() => Date.now());

  const [state, formAction, isPending] = useActionState(
    submitSiteLead,
    initialSubmitSiteLeadState,
  );

  if (state.ok) {
    return (
      <div className="osbb-form-success" role="status">
        <span aria-hidden="true">✓</span>
        <div>
          <h3>Дякуємо за заявку</h3>
          <p>
            {state.successMessage ??
              "Ми зв’яжемося з вами у робочий час."}
          </p>
        </div>
      </div>
    );
  }

  const fieldError = (
    field: keyof typeof state.fieldErrors,
  ) => state.fieldErrors[field];

  return (
    <form action={formAction} className="osbb-form">
      <div className="osbb-form__grid">
        <label>
          <span>Ваше ім&apos;я</span>
          <input
            aria-describedby={
              fieldError("name") ? "site-lead-name-error" : undefined
            }
            aria-invalid={Boolean(fieldError("name"))}
            autoComplete="name"
            maxLength={80}
            name="name"
            placeholder="Як до вас звертатися"
            required
            type="text"
          />
          {fieldError("name") ? (
            <small id="site-lead-name-error" role="alert">
              {fieldError("name")}
            </small>
          ) : null}
        </label>

        <label>
          <span>Телефон</span>
          <input
            aria-describedby={
              fieldError("phone") ? "site-lead-phone-error" : undefined
            }
            aria-invalid={Boolean(fieldError("phone"))}
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            name="phone"
            placeholder="+38 (___) ___-__-__"
            required
            type="tel"
          />
          {fieldError("phone") ? (
            <small id="site-lead-phone-error" role="alert">
              {fieldError("phone")}
            </small>
          ) : null}
        </label>

        <label>
          <span>Місто</span>
          <input
            aria-describedby={
              fieldError("city") ? "site-lead-city-error" : undefined
            }
            aria-invalid={Boolean(fieldError("city"))}
            autoComplete="address-level2"
            maxLength={80}
            name="city"
            placeholder="Ваше місто"
            required
            type="text"
          />
          {fieldError("city") ? (
            <small id="site-lead-city-error" role="alert">
              {fieldError("city")}
            </small>
          ) : null}
        </label>

        <label>
          <span>Ваша роль</span>
          <select
            aria-describedby={
              fieldError("role") ? "site-lead-role-error" : undefined
            }
            aria-invalid={Boolean(fieldError("role"))}
            defaultValue=""
            name="role"
            required
          >
            <option disabled value="">
              Оберіть варіант
            </option>

            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {fieldError("role") ? (
            <small id="site-lead-role-error" role="alert">
              {fieldError("role")}
            </small>
          ) : null}
        </label>
      </div>

      <label>
        <span>Коротко про будинок або запит</span>
        <textarea
          aria-describedby={
            fieldError("message")
              ? "site-lead-message-error"
              : undefined
          }
          aria-invalid={Boolean(fieldError("message"))}
          maxLength={1000}
          name="message"
          placeholder="Необов’язково"
          rows={4}
        />
        {fieldError("message") ? (
          <small id="site-lead-message-error" role="alert">
            {fieldError("message")}
          </small>
        ) : null}
      </label>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="osbb-form__honeypot"
        name="company_website"
        tabIndex={-1}
        type="text"
      />

      <input
        name="form_started_at"
        type="hidden"
        value={formStartedAt}
      />

      {state.error ? (
        <div className="osbb-form__error" role="alert">
          {state.error}
          {state.retryAfterSeconds ? (
            <span>
              {" "}
              Повторна спроба приблизно через{" "}
              {Math.max(
                1,
                Math.ceil(state.retryAfterSeconds / 60),
              )}{" "}
              хв.
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        className="osbb-btn osbb-btn--primary"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Надсилаємо..." : "Залишити заявку"}
      </button>

      <p className="osbb-form__legal">
        Натискаючи кнопку, ви погоджуєтеся з політикою конфіденційності.
      </p>
    </form>
  );
}
