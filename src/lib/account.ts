// The account number is the whole credential: no email, no password, nothing to
// reset. It lives on the device so the number is only typed when moving to a
// new one.

import { readText, writeText } from "@/lib/storage";

export const ACCOUNT_KEY = "ethiotime-account";

export const isAccountNumber = (value: string) => /^\d{16}$/.test(value);

// Digits only, so a pasted "5073 0740 6466 8680" is accepted as typed.
export const cleanAccountNumber = (value: string) => value.replace(/\D/g, "");

// Said in fours, which is how anyone reads a long number back.
export const formatAccountNumber = (value: string) =>
  value.replace(/(\d{4})(?=\d)/g, "$1 ");

export function loadAccount(): string | null {
  const stored = readText(ACCOUNT_KEY) ?? "";
  return isAccountNumber(stored) ? stored : null;
}

export const saveAccount = (number: string) => writeText(ACCOUNT_KEY, number);

export function forgetAccount() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Storage unavailable; there was nothing to forget.
  }
}
