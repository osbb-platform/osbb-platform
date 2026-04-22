"use client";
import { houseSpecialistsCopy } from "@/src/shared/publicCopy/house";

import { useActionState, useState } from "react";
import { createSpecialistContactRequest } from "@/src/modules/houses/actions/createSpecialistContactRequest";

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

function formatUaPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^380/, "");
  const trimmed = digits.slice(0, 9);

  const part1 = trimmed.slice(0, 2);
  const part2 = trimmed.slice(2, 5);
  const part3 = trimmed.slice(5, 7);
  const part4 = trimmed.slice(7, 9);

  let result = "+380";

  if (part1) result += ` ${part1}`;
  if (part2) result += ` ${part2}`;
  if (part3) result += ` ${part3}`;
  if (part4) result += ` ${part4}`;

  return result;
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
  const [phone, setPhone] = useState("+380");

  if (state.successMessage) {
    return (
      <div className="rounded-2xl border border-[#CFE3D6] bg-[#EAF4EE] px-5 py-4">
        <div className="text-base font-semibold text-[#1F2A37]">
          {houseSpecialistsCopy.form.successTitle}
        </div>
        <div className="mt-2 text-sm leading-7 text-emerald-800">
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

      <div>
        <label className="mb-2 block text-sm font-medium text-[#2A3642]">
          {houseSpecialistsCopy.form.name}
        </label>
        <input
          name="requesterName"
          type="text"
          required
          placeholder={houseSpecialistsCopy.form.namePlaceholder}
          className="w-full rounded-2xl border border-[#D8CEC2] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition focus:border-[#BFAE9F]"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#2A3642]">
          Email
        </label>
        <input
          name="requesterEmail"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-[#D8CEC2] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition focus:border-[#BFAE9F]"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#2A3642]">
          {houseSpecialistsCopy.form.phone}
        </label>
        <input
          name="requesterPhone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(formatUaPhone(event.target.value))}
          placeholder="+380 67 123 45 67"
          className="w-full rounded-2xl border border-[#D8CEC2] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition focus:border-[#BFAE9F]"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#2A3642]">
          {houseSpecialistsCopy.form.apartment}
        </label>
        <select
          name="apartment"
          required
          defaultValue=""
          className="w-full rounded-2xl border border-[#D8CEC2] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition focus:border-[#BFAE9F]"
        >
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
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#2A3642]">
          {houseSpecialistsCopy.form.comment}
        </label>
        <textarea
          name="comment"
          rows={4}
          placeholder={houseSpecialistsCopy.form.commentPlaceholder}
          className="w-full rounded-2xl border border-[#D8CEC2] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition focus:border-[#BFAE9F]"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[#2F3A4F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#1F2A37] disabled:opacity-60"
      >
        {isPending ? houseSpecialistsCopy.form.sending : houseSpecialistsCopy.form.send}
      </button>
    </form>
  );
}
