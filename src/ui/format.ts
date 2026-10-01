import { tenant } from '../data';
import { formatDate, formatDateTime } from '../domain/time';

/**
 * The one date formatter: every calendar date reads "2 Dec 2027"; times read "2 Dec 2027, 10:00".
 * Both use the tenant time zone. Never show a raw YYYY-MM-DD.
 */
export const fmtDate = (value: string) => formatDate(value, tenant.timeZone);
export const fmtDateTime = (value: string) => formatDateTime(value, tenant.timeZone);
