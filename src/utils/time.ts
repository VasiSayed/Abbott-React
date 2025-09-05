export function fmt(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function secondsUntil(dtIso: string) {
  const target = new Date(dtIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((target - now) / 1000));
}

export function asHMS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const two = (n: number) => n.toString().padStart(2, "0");
  return `${two(h)}:${two(m)}:${two(s)}`;
}
