import { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </header>
          <main className="flex-1 bg-gray-50 p-6 dark:bg-gray-950">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}