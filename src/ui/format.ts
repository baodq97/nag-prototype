import { tenant } from '../data';
import { formatDate, formatDateTime } from '../domain/time';

/** Dates and times shown in the tenant time zone. */
export const fmtDate = (value: string) => formatDate(value, tenant.timeZone);
export const fmtDateTime = (value: string) => formatDateTime(value, tenant.timeZone);
