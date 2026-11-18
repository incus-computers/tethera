import indonesian from "./id.json";
export function translate(text: string, locale: "id" | "en"): string {
  return locale === "id" ? (indonesian as Record<string,string>)[text] || text : text;
}
