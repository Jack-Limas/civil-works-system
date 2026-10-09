import type { MultipartFields } from "@fastify/multipart";

/** Text value of a multipart field sent before the file, or undefined (typed: no `any`). */
export function fieldValue(fields: MultipartFields, name: string): string | undefined {
  const entry = fields[name];
  const part = Array.isArray(entry) ? entry[0] : entry;
  if (!part || part.type !== "field" || typeof part.value !== "string") return undefined;
  const value = part.value.trim();
  return value === "" ? undefined : value;
}
