"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b border-gray-200 px-6 dark:border-gray-800">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}