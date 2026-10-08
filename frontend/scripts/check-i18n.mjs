#!/usr/bin/env node
/**
 * i18n consistency check (npm run i18n:check).
 *
 * 1. Every locale file must have exactly the same keys as the default locale.
 * 2. Every static key used in the code through a translator returned by
 *    useTranslations()/getTranslations() must exist in the messages.
 *    Dynamic keys (`t(`status.${value}`)`) are checked by their static prefix,
 *    which must be an existing namespace object.
 *
 * Exits with code 1 and a readable report when something is wrong.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "src", "messages");
const srcDir = join(root, "src");
const DEFAULT_LOCALE = "es";

/** Flattens nested messages into dot paths; objects are recorded too so prefixes can be validated. */
function flatten(obj, prefix = "", leaves = new Set(), branches = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      branches.add(path);
      flatten(value, path, leaves, branches);
    } else {
      leaves.add(path);
    }
  }
  return { leaves, branches };
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "messages") walk(full, files);
    } else if (/\.(tsx?|mjs|js)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const problems = [];

// ---------- 1. Key parity between locales ----------
const locales = readdirSync(messagesDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
const catalogs = Object.fromEntries(
  locales.map((l) => [l, flatten(JSON.parse(readFileSync(join(messagesDir, `${l}.json`), "utf8")))])
);
const base = catalogs[DEFAULT_LOCALE];

for (const locale of locales) {
  if (locale === DEFAULT_LOCALE) continue;
  const other = catalogs[locale];
  for (const key of base.leaves) if (!other.leaves.has(key)) problems.push(`[${locale}] missing key: ${key}`);
  for (const key of other.leaves) if (!base.leaves.has(key)) problems.push(`[${locale}] extra key (not in ${DEFAULT_LOCALE}): ${key}`);
}

// ---------- 2. Keys used in code ----------
const translatorDecl =
  /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([\w.]+)["'`]|\{[^}]*namespace:\s*["'`]([\w.]+)["'`][^}]*\})?\s*\)/g;

for (const file of walk(srcDir)) {
  const code = readFileSync(file, "utf8");
  const rel = relative(root, file);
  // The same variable name may be bound to different namespaces in different
  // functions of one file (e.g. generateMetadata and the page), so a key is
  // accepted when it exists under ANY namespace bound to that name.
  const translators = new Map();
  for (const m of code.matchAll(translatorDecl)) {
    const namespaces = translators.get(m[1]) ?? new Set();
    namespaces.add(m[2] ?? m[3] ?? "");
    translators.set(m[1], namespaces);
  }

  for (const [name, namespaces] of translators) {
    const candidates = (key) => [...namespaces].map((ns) => (ns ? `${ns}.${key}` : key));
    const known = (key, set) => candidates(key).find((k) => set.has(k));
    const full = (key) => candidates(key).join(" | ");
    // t("key") / t.rich("key") / t.markup("key") / t.raw("key")
    const staticCall = new RegExp(`(?<![\\w.])${name}(?:\\.(?:rich|markup|raw))?\\(\\s*["']([^"'\\n]+)["']`, "g");
    for (const m of code.matchAll(staticCall)) {
      if (!known(m[1], base.leaves) && !known(m[1], base.branches)) problems.push(`${rel}: unknown key "${full(m[1])}"`);
    }
    // t(`prefix.${dynamic}`) -> prefix must be an existing object
    const dynamicCall = new RegExp(`(?<![\\w.])${name}\\(\\s*\`([^\`$]*)\\$\\{`, "g");
    for (const m of code.matchAll(dynamicCall)) {
      const prefix = m[1].replace(/\.$/, "");
      if (!prefix) continue;
      if (!known(prefix, base.branches)) problems.push(`${rel}: unknown dynamic prefix "${full(prefix)}.*"`);
    }
  }
}

if (problems.length > 0) {
  console.error(`i18n check failed with ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`i18n check passed: ${base.leaves.size} keys, locales ${locales.join(", ")} in sync.`);
