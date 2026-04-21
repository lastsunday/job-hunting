import dayjs from 'dayjs';

export function formatLocalDate(utcString: string | undefined): string {
  if (!utcString) return '-';
  return dayjs(utcString).format('YYYY-MM-DD HH:mm:ss');
}
