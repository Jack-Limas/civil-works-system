"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";
import { ConstructionSkyline } from "@/components/auth/construction-skyline";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Logo } from "@/components/ui/logo";
import { useApiErrorMessage } from "@/lib/api-error";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const errorMessage = useApiErrorMessage();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--spot-x", `${x}%`);
    e.currentTarget.style.setProperty("--spot-y", `${y}%`);
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const user = await authService.login(values.email, values.password);
      setUser(user);
      router.push("/dashboard");
    } catch (error) {
      // 401 = wrong credentials; anything else (network, 5xx) gets its own message
      setServerError(errorMessage(error, { 401: t("invalidCredentials") }));
    }
  }

  return (
    <main className="relative flex min-h-screen">
      <div className="absolute right-4 top-4 z-30 flex gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      {/* Panel de marca — intencionalmente fijo (estilo Linear/Vercel) */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative hidden w-1/2 overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ "--spot-x": "50%", "--spot-y": "50%" } as React.CSSProperties}
      >
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-150"
          style={{
            background:
              "radial-gradient(500px circle at var(--spot-x) var(--spot-y), rgba(234,88,12,0.12), transparent 70%)",
          }}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
          <motion.div
            className="absolute -left-16 top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 24, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-10 top-32 h-40 w-40 rounded-full bg-ai/15 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <ConstructionSkyline />

        <div className="relative z-10 flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="text-xl font-semibold text-white">
              {tCommon("appShortName")}
            </h1>
            <p className="text-sm text-sidebar-ink">{tCommon("appTagline")}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            {t("heroTitle")}
          </h2>
          <p className="mt-3 text-sidebar-ink">{t("heroSubtitle")}</p>
        </div>

        <div className="relative z-10 text-xs text-sidebar-ink">
          © {new Date().getFullYear()} {tCommon("appShortName")}
        </div>
      </div>

      {/* Formulario — reacciona dinámicamente al tema y al idioma */}
      <div className="flex w-full items-center justify-center bg-bg px-6 lg:w-1/2">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm space-y-4"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Logo size={28} />
            <h1 className="text-lg font-semibold text-ink">
              {tCommon("appShortName")}
            </h1>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink">{t("login")}</h2>
            <p className="text-sm text-ink-muted">{t("loginSubtitle")}</p>
          </div>

          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-ink">
              {t("email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-critical">{t("emailRequired")}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-ink">
              {t("password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-critical">
                {t("passwordRequired")}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm font-medium text-critical">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isSubmitting ? t("signingIn") : t("loginButton")}
          </button>
        </motion.form>
      </div>
    </main>
  );
}