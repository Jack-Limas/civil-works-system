"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";

const LOCALES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink hover:bg-surface-2"
      >
        {locale.toUpperCase()}
        <ChevronDown size={14} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                router.replace(pathname, { locale: l.code });
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                locale === l.code ? "font-medium text-accent" : "text-ink"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}