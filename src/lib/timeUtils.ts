export function matchStartUTC(date: string, time: string): Date {
  const [y, m, d] = date.replace(/\//g, "-").split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

export function matchEndUTC(date: string, time: string): Date {
  const [y, m, d] = date.replace(/\//g, "-").split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

export function isWithin24Hours(date: string, startTime: string): boolean {
  const start = matchStartUTC(date, startTime);
  return start.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
}

function formatCountValue(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatMatchStartCountdown(date: string, startTime: string): string {
  const start = matchStartUTC(date, startTime);
  if (Number.isNaN(start.getTime()) || !startTime) return "";
  const remain = start.getTime() - Date.now();
  if (remain <= 0) return "球局已開打";

  const minutes = Math.floor(remain / (60 * 1000));
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    if (hours > 0) {
      return `即將開打：${days} 天 ${hours} 小時 ${formatCountValue(mins)} 分`;
    }
    return `即將開打：${days} 天`;
  }

  if (hours > 0) {
    return `即將開打：${hours} 小時 ${formatCountValue(mins)} 分`;
  }

  return `即將開打：${formatCountValue(mins)} 分`;
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
