"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

/**
 * next-themes injects a blocking script that applies the stored theme before
 * paint, so the provider must wrap the tree from the first render. Rendering
 * children without it until mount caused a full remount of the app and a
 * flash of the light theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
