"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { authService } from "@/lib/auth-service";
import { useAuthStore } from "@/store/auth.store";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const user = await authService.login(values.email, values.password);
      setUser(user);
      router.push("/dashboard");
    } catch {
      setServerError(t("invalidCredentials"));
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Panel izquierdo: marca + fondo animado */}
      <div className="relative hidden w-1/2 overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
          <motion.div
            className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-xl font-semibold text-white">{tCommon("appShortName")}</h1>
          <p className="text-sm text-sidebar-ink">{tCommon("appTagline")}</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">{t("heroTitle")}</h2>
          <p className="mt-3 text-sidebar-ink">{t("heroSubtitle")}</p>
        </div>

        <div className="relative z-10 text-xs text-sidebar-ink">
          © {new Date().getFullYear()} {tCommon("appShortName")}
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex w-full items-center justify-center bg-bg px-6 lg:w-1/2">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm space-y-4"
        >
          <div className="mb-6 lg:hidden">
            <h1 className="text-lg font-semibold">{tCommon("appShortName")}</h1>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("login")}</h2>
            <p className="text-sm text-ink-muted">Ingresa tus credenciales para continuar.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("email")}</label>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {errors.email && <p className="mt-1 text-xs text-critical">{t("emailRequired")}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("password")}</label>
            <input
              type="password"
              {...register("password")}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {errors.password && <p className="mt-1 text-xs text-critical">{t("passwordRequired")}</p>}
          </div>

          {serverError && <p className="text-sm text-critical">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isSubmitting ? "..." : t("loginButton")}
          </button>
        </motion.form>
      </div>
    </main>
  );
}