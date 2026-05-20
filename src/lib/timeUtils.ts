export function matchStartUTC(date: string, time: string): Date {
  const [y, m, d] = date.replace(/\//g, "-").split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

export function isWithin24Hours(date: string, startTime: string): boolean {
  const start = matchStartUTC(date, startTime);
  return start.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
}

export function isTimeRangeValid(start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return sh * 60 + sm < eh * 60 + em;
}

export function weekdayLabel(dateStr: string): string {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  const d = new Date(dateStr.replace(/\//g, "-"));
  return `週${labels[d.getDay()]}`;
}
