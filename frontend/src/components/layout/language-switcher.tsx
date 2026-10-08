"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ChevronDown, Languages } from "lucide-react";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("changeLanguage")}
        disabled={isPending}
        className="flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-sm text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
      >
        <Languages size={15} className="text-ink-muted" aria-hidden />
        {locale.toUpperCase()}
        <ChevronDown size={14} className="text-ink-muted" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("changeLanguage")}
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-md border border-line bg-surface shadow-lg"
        >
          {routing.locales.map((code) => (
            <li key={code} role="option" aria-selected={locale === code}>
              <button
                type="button"
                lang={code}
                onClick={() => {
                  setOpen(false);
                  startTransition(() => router.replace(pathname, { locale: code }));
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                  locale === code ? "font-medium text-accent" : "text-ink"
                }`}
              >
                {t(`languages.${code}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
