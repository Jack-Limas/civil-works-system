import { Sidebar } from "@/components/layout/sidebar";
import { PasswordChangeGuard } from "@/components/auth/password-change-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <PasswordChangeGuard />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
