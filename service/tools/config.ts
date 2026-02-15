import { DAYS_TO_MS_MULTIPLIER, DEFAULT_COOKIE_TTL_DAYS, DEFAULT_EMAIL_TTL_DAYS } from './const';

export const getEmailTtlDays = (): number => {
  const raw = process.env.EMAIL_TTL_DAYS;

  if (raw === undefined || raw === '') {
    return DEFAULT_EMAIL_TTL_DAYS;
  }

  const days = Number(raw);

  if (Number.isNaN(days) || !Number.isInteger(days)) {
    return DEFAULT_EMAIL_TTL_DAYS;
  }

  if (days < 1) {
    return 1;
  }
  if (days > 30) {
    return 30;
  }
  return days;
};

export const getCookieMaxAgeMs = (): number => {
  const raw = process.env.COOKIE_TTL_DAYS;

  if (raw === undefined || raw === '') {
    return DEFAULT_COOKIE_TTL_DAYS * DAYS_TO_MS_MULTIPLIER;
  }

  const days = Number(raw);

  if (Number.isNaN(days) || !Number.isInteger(days)) {
    return DEFAULT_COOKIE_TTL_DAYS * DAYS_TO_MS_MULTIPLIER;
  }

  if (days < 1) {
    return 1 * DAYS_TO_MS_MULTIPLIER;
  }
  if (days > 365) {
    return 365 * DAYS_TO_MS_MULTIPLIER;
  }
  return days * DAYS_TO_MS_MULTIPLIER;
};
