"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      className="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
      aria-label="Language selector"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
}