"use client";

import { useId, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { authService } from "@/lib/auth-service";
import { apiErrorCode } from "@/lib/api-client";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";

/** Same policy as the API: at least 8 characters, different from the current one (checked server-side). */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const schema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX),
    newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"] });
type FormValues = z.infer<typeof schema>;

function PasswordInput({
  id,
  invalid,
  autoComplete,
  registration,
}: {
  id: string;
  invalid: boolean;
  autoComplete: string;
  registration: UseFormRegisterReturn;
}) {
  const t = useTranslations("changePassword");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        {...registration}
        className={`${fieldClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hide") : t("show")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </div>
  );
}

/** Used by the forced-change screen and by "My profile". */
export function ChangePasswordForm({ forced = false, onDone }: { forced?: boolean; onDone?: () => void }) {
  const t = useTranslations("changePassword");
  const errorMessage = useApiErrorMessage();
  const setUser = useAuthStore((s) => s.setUser);
  const baseId = useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const user = await authService.changePassword(values.currentPassword, values.newPassword);
      setUser(user);
      reset();
      toast.success(t("success"));
      onDone?.();
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === "WRONG_CURRENT_PASSWORD") return setError("currentPassword", { type: "server", message: t("wrongCurrent") });
      if (code === "PASSWORD_REUSED") return setError("newPassword", { type: "server", message: t("reused") });
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field
        id={`${baseId}-current`}
        label={forced ? t("currentForced") : t("current")}
        error={errors.currentPassword && (errors.currentPassword.type === "server" ? errors.currentPassword.message : t("required"))}
      >
        <PasswordInput id={`${baseId}-current`} invalid={!!errors.currentPassword} autoComplete="current-password" registration={register("currentPassword")} />
      </Field>
      <Field
        id={`${baseId}-new`}
        label={t("new")}
        hint={t("rules")}
        error={errors.newPassword && (errors.newPassword.type === "server" ? errors.newPassword.message : t("tooShort"))}
      >
        <PasswordInput id={`${baseId}-new`} invalid={!!errors.newPassword} autoComplete="new-password" registration={register("newPassword")} />
      </Field>
      <Field id={`${baseId}-confirm`} label={t("confirm")} error={errors.confirmPassword && t("mismatch")}>
        <PasswordInput id={`${baseId}-confirm`} invalid={!!errors.confirmPassword} autoComplete="new-password" registration={register("confirmPassword")} />
      </Field>
      <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} min-h-11 w-full`}>
        {isSubmitting ? t("saving") : t("submit")}
      </button>
    </form>
  );
}
