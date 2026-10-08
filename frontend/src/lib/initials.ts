/** Avatar initial that skips professional titles: "Ing. Camila Rosero" -> "C". */
export function nameInitial(name: string | null | undefined): string {
  if (!name) return "·";
  return name.replace(/^(ing|arq|dr|dra|sr|sra)\.?\s+/i, "")[0]?.toUpperCase() ?? "·";
}
