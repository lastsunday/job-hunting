import dayjs from 'dayjs';
import { CronExpressionParser } from 'cron-parser';

export function getNextCronTimes(cron: string, count = 5): Date[] | null {
  try {
    const interval = CronExpressionParser.parse(cron);
    return interval.take(count).map((d) => d.toDate());
  } catch {
    return null;
  }
}

export function formatCronTime(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}
