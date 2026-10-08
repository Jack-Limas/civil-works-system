import { setRequestLocale } from "next-intl/server";
import { LoginScreen } from "@/components/auth/login-screen";

/**
 * Public and identical for every visitor: prerendered per locale (SSG).
 * The form itself is a client island (react-hook-form + API call).
 */
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginScreen />;
}
