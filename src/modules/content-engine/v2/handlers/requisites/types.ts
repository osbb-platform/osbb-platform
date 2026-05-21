export type HouseRequisites = {
  id: string;
  house_id: string;
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purpose_template: string;
  payment_url: string;
  payment_button_label: string;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type SaveRequisitesPayload = {
  lockVersion: number;
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purposeTemplate: string;
  paymentUrl: string;
  paymentButtonLabel: string;
};
