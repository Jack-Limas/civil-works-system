"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};

export function ThemeSwitcher() {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  // true only on the client: avoids a hydration mismatch without setState in an effect
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={t("toggleTheme")}
      title={isDark ? t("themeLight") : t("themeDark")}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
