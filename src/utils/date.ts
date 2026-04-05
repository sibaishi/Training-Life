import { Weekday } from '../types';

export function getTodayString(): string {
  return formatDate(new Date());
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekday(dateStr: string): Weekday {
  return parseDate(dateStr).getDay() as Weekday;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getWeekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}

export function getDateWeekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS[getWeekday(dateStr)];
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}