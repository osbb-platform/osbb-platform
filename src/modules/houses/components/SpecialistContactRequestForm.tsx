"use client";
import { houseSpecialistsCopy } from "@/src/shared/publicCopy/house";

import { useActionState, useState } from "react";
import { createSpecialistContactRequest } from "@/src/modules/houses/actions/createSpecialistContactRequest";
import { PubFormField } from "@/src/shared/ui/public/PubFormField";
import { PubInput } from "@/src/shared/ui/public/PubInput";
import { PubSelect } from "@/src/shared/ui/public/PubSelect";
import { PubTextarea } from "@/src/shared/ui/public/PubTextarea";
import { PubButton } from "@/src/shared/ui/public/PubButton";

type Props = {
  houseId: string;
  houseSlug: string;
  houseName: string;
  category: string;
  specialistId: string;
  specialistLabel: string;
  apartmentOptions: Array<{
    id: string;
    label: string;
    ownerName: string;
  }>;
};

const initialState = {
  error: null,
  successMessage: null,
};

function formatPhone(value: string) {
  const input = value.trim();

  if (!input) {
    return "";
  }

  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (hasPlus) {
    return `+${digits.slice(0, 15)}`;
  }

  return digits.slice(0, 15);
}

export function SpecialistContactRequestForm({
  houseId,
  houseSlug,
  houseName,
  category,
  specialistId,
  specialistLabel,
  apartmentOptions,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    createSpecialistContactRequest,
    initialState,
  );
  const [phone, setPhone] = useState("");

  if (state.successMessage) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] px-5 py-4">
        <div className="text-base font-semibold text-[var(--pub-text)]">
          {houseSpecialistsCopy.form.successTitle}
        </div>
        <div className="mt-2 text-sm leading-7 text-[var(--pub-success-text)]">
          {houseSpecialistsCopy.form.successText}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="houseName" value={houseName} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="specialistId" value={specialistId} />
      <input type="hidden" name="specialistLabel" value={specialistLabel} />

      <PubFormField label={houseSpecialistsCopy.form.name}>
        {(id) => (
          <PubInput
            id={id}
            name="requesterName"
            type="text"
            required
            placeholder={houseSpecialistsCopy.form.namePlaceholder}
          />
        )}
      </PubFormField>

      <PubFormField label="Email">
        {(id) => (
          <PubInput
            id={id}
            name="requesterEmail"
            type="email"
            required
            placeholder="you@example.com"
          />
        )}
      </PubFormField>

      <PubFormField label={houseSpecialistsCopy.form.phone}>
        {(id) => (
          <PubInput
            id={id}
            name="requesterPhone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="+380 67 123 45 67 або 0800 00 00 00"
          />
        )}
      </PubFormField>

      <PubFormField label={houseSpecialistsCopy.form.apartment}>
        {(id) => (
          <PubSelect id={id} name="apartment" required defaultValue="">
            <option value="" disabled>
              {houseSpecialistsCopy.form.selectApartment}
            </option>
            {apartmentOptions.map((option) => (
              <option key={option.id} value={option.label}>
                {option.ownerName
                  ? `Кв. ${option.label} — ${option.ownerName}`
                  : `Кв. ${option.label}`}
              </option>
            ))}
          </PubSelect>
        )}
      </PubFormField>

      <PubFormField label={houseSpecialistsCopy.form.comment}>
        {(id) => (
          <PubTextarea
            id={id}
            name="comment"
            rows={4}
            placeholder={houseSpecialistsCopy.form.commentPlaceholder}
          />
        )}
      </PubFormField>

      {state.error ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm text-[var(--pub-danger-text)]">
          {state.error}
        </div>
      ) : null}

      <PubButton type="submit" variant="primary" fullWidth loading={isPending}>
        {isPending ? houseSpecialistsCopy.form.sending : houseSpecialistsCopy.form.send}
      </PubButton>
    </form>
  );
}
