"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { HardHat, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { useCreateUser, useUpdateUser, type ManagedUser, type UserDetail } from "@/lib/users-service";
import { apiErrorCode } from "@/lib/api-client";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import type { Role } from "@/types/auth";

const PHONE = /^[\d\s+()-]{7,30}$/;
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  role: z.enum(["ADMIN", "RESIDENT_ENGINEER"]),
  phone: z.string().trim().refine((v) => v === "" || PHONE.test(v)),
});
type FormValues = z.infer<typeof schema>;

const ROLES: Array<{ value: Role; icon: typeof ShieldCheck; hint: "roleHintAdmin" | "roleHintResident" }> = [
  { value: "RESIDENT_ENGINEER", icon: HardHat, hint: "roleHintResident" },
  { value: "ADMIN", icon: ShieldCheck, hint: "roleHintAdmin" },
];

/**
 * Create: the server generates the temporary password (shown once by the
 * caller). Edit: email is the sign-in identity and stays read-only; your own
 * role is locked (the API enforces both).
 */
export function UserForm({
  user,
  onCreated,
  onSaved,
  onCancel,
}: {
  user: Pick<ManagedUser | UserDetail, "id" | "name" | "email" | "role" | "phone"> | null;
  onCreated?: (created: { name: string; password: string; id: string }) => void;
  onSaved?: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("users.form");
  const tUsers = useTranslations("users");
  const tRoles = useTranslations("common.roles");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const meId = useAuthStore((s) => s.user?.id);
  const create = useCreateUser();
  const update = useUpdateUser();
  const editingSelf = !!user && user.id === meId;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "RESIDENT_ENGINEER", phone: user?.phone ?? "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          input: { name: values.name, phone: values.phone || null, ...(!editingSelf && { role: values.role }) },
        });
        toast.success(tUsers("toasts.updated"));
        onSaved?.();
      } else {
        const result = await create.mutateAsync({ name: values.name, email: values.email, role: values.role, phone: values.phone || undefined });
        onCreated?.({ id: result.data.id, name: result.data.name, password: result.temporaryPassword });
      }
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === "EMAIL_TAKEN") return setError("email", { type: "server", message: tUsers("errors.emailTaken") });
      if (code === "SELF_ACTION") return toast.error(tUsers("errors.selfAction"));
      if (code === "LAST_ADMIN") return toast.error(tUsers("errors.lastAdmin"));
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id="user-name" label={t("name")} error={errors.name && t("errors.name")}>
        <input id="user-name" autoComplete="off" {...register("name")} placeholder={t("namePlaceholder")} aria-invalid={!!errors.name} className={fieldClass} />
      </Field>

      <Field
        id="user-email"
        label={t("email")}
        hint={user ? t("emailLocked") : undefined}
        error={errors.email && (errors.email.type === "server" ? errors.email.message : t("errors.email"))}
      >
        <div className="relative">
          <input
            id="user-email"
            type="email"
            autoComplete="off"
            readOnly={!!user}
            {...register("email")}
            placeholder={t("emailPlaceholder")}
            aria-invalid={!!errors.email}
            className={`${fieldClass} ${user ? "cursor-not-allowed pr-10 text-ink-muted" : ""}`}
          />
          {user && <Lock size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />}
        </div>
      </Field>

      <Field id="user-phone" label={`${t("phone")} ${tCommon("optional")}`} error={errors.phone && t("errors.phone")}>
        <input id="user-phone" type="tel" inputMode="tel" autoComplete="off" {...register("phone")} placeholder={t("phonePlaceholder")} aria-invalid={!!errors.phone} className={fieldClass} />
      </Field>

      <div>
        <p id="user-role-label" className="mb-1.5 text-sm font-medium text-ink">
          {t("role")}
        </p>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="user-role-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLES.map(({ value, icon: Icon, hint }) => {
                const selected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={editingSelf}
                    onClick={() => field.onChange(value)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent/40"
                    }`}
                  >
                    <Icon size={20} className={selected ? "mt-0.5 text-accent" : "mt-0.5 text-ink-muted"} aria-hidden />
                    <span>
                      <span className="block text-sm font-medium text-ink">{tRoles(value)}</span>
                      <span className="block text-xs text-ink-muted">{t(hint)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {editingSelf && <p className="mt-1.5 text-xs text-ink-muted">{t("ownRole")}</p>}
      </div>

      {!user && (
        <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
          <KeyRound size={14} className="mt-0.5 shrink-0" aria-hidden /> {t("passwordNotice")}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          {t("cancel")}
        </button>
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} sm:min-w-40`}>
          {isSubmitting ? (user ? t("saving") : t("creating")) : user ? t("save") : t("create")}
        </button>
      </div>
    </form>
  );
}
