export function normalizeIndonesianPhone(value: unknown): string {
  if (typeof value !== "string" || value.length > 30 || !/^[+\d\s()-]+$/.test(value)) throw new Error("Enter a valid Indonesian phone number beginning 08, 62 or +62.");
  const digits = value.replace(/[\s()-]/g, "");
  const national = digits.startsWith("+62") ? digits.slice(3) : digits.startsWith("62") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : "";
  if (!/^[2-9]\d{7,11}$/.test(national)) throw new Error("Enter a valid Indonesian phone number beginning 08, 62 or +62.");
  return `+62${national}`;
}
export function formatIndonesiaDate(value: string | number | Date | null | undefined, locale: "id" | "en" = "id", timeZone = "Asia/Jakarta") {
  if (value === null || value === undefined || value === "") return locale === "id" ? "Belum tersedia" : "Unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return locale === "id" ? "Belum tersedia" : "Unavailable";
  if (!["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"].includes(timeZone)) timeZone = "Asia/Jakarta";
  const text = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", { timeZone, year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return `${text} ${timeZone === "Asia/Jakarta" ? "WIB" : timeZone === "Asia/Makassar" ? "WITA" : "WIT"}`;
}
