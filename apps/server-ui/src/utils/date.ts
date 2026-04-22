import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatLocalDate(utcString: string | undefined): string {
  if (!utcString) return '-';
  return dayjs(utcString).format('YYYY-MM-DD HH:mm:ss');
}

export function toLocalISOString(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return dayjs(localDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
}

export function toLocalISOStringWithTime(
  date: Date | undefined,
): string | undefined {
  if (!date) return undefined;
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
}
