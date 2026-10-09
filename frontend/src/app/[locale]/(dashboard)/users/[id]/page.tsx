"use client";

import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, KeyRound, Mail, Pencil, Phone, Power, PowerOff, UserPlus, UserX } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { Modal } from "@/components/ui/modal";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges";
import { UserForm } from "@/components/users/user-form";
import { useUserActions } from "@/components/users/use-user-actions";
import { actionTone, BUSINESS_TIME_ZONE, useAuditLabels } from "@/components/audit/audit-labels";
import { Link } from "@/i18n/navigation";
import { nameInitial } from "@/lib/initials";
import { useUserDetail } from "@/lib/users-service";
import { useAuthStore } from "@/store/auth.store";

function InfoRow({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <div className="text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

function UserDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("users");
  const tProfile = useTranslations("profile");
  const tProjectStatus = useTranslations("projects.status");
  const format = useFormatter();
  const labels = useAuditLabels();
  const meId = useAuthStore((s) => s.user?.id);
  const { data: user, isLoading, isError } = useUserDetail(id);
  const { ask, dialogs } = useUserActions();
  const [editing, setEditing] = useState(false);

  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE });
  const back = (
    <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">
      <ArrowLeft size={15} aria-hidden /> {t("detail.back")}
    </Link>
  );

  if (isLoading) {
    return (
      <main className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <div className="h-32 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      </main>
    );
  }
  if (isError || !user) {
    return (
      <main className="p-4 sm:p-6">
        {back}
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
          <UserX size={32} className="text-ink-muted" aria-hidden />
          <p className="text-sm text-ink-muted">{t("detail.notFound")}</p>
        </div>
      </main>
    );
  }

  const self = user.id === meId;
  const target = { id: user.id, name: user.name, projectsInCharge: user.projectsInCharge.length };

  return (
    <>
      <DashboardHeader title={user.name} subtitle={user.email} />
      <main className="space-y-5 p-4 sm:p-6">
        {back}
        <Reveal className="space-y-5">
          <RevealItem>
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold ${
                  user.isActive ? "bg-accent/15 text-accent" : "bg-surface-2 text-ink-muted"
                }`}
                aria-hidden
              >
                {nameInitial(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink">{user.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <RoleBadge role={user.role} />
                  <UserStatusBadge isActive={user.isActive} mustChangePassword={user.mustChangePassword} />
                </div>
                {user.deactivatedAt && <p className="mt-1 text-xs text-ink-muted">{t("detail.deactivatedAt", { date: when(user.deactivatedAt) })}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(true)} className={secondaryButtonClass}>
                  <Pencil size={15} aria-hidden /> {t("actions.edit")}
                </button>
                {!self && user.isActive && (
                  <button type="button" onClick={() => ask("reset", target)} className={secondaryButtonClass}>
                    <KeyRound size={15} aria-hidden /> {t("actions.resetPassword")}
                  </button>
                )}
                {!self &&
                  (user.isActive ? (
                    <button type="button" onClick={() => ask("deactivate", target)} className={`${secondaryButtonClass} text-critical`}>
                      <PowerOff size={15} aria-hidden /> {t("actions.deactivate")}
                    </button>
                  ) : (
                    <button type="button" onClick={() => ask("activate", target)} className={primaryButtonClass}>
                      <Power size={15} aria-hidden /> {t("actions.activate")}
                    </button>
                  ))}
              </div>
            </section>
          </RevealItem>

          <RevealItem>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-5">
                <section className="rounded-xl border border-line bg-surface px-5 py-3">
                  <h2 className="py-2 text-sm font-semibold text-ink">{t("detail.info")}</h2>
                  <div className="divide-y divide-line">
                    <InfoRow icon={Mail} label={t("form.email")}>
                      <span className="break-all">{user.email}</span>
                    </InfoRow>
                    <InfoRow icon={Phone} label={t("form.phone")}>
                      {user.phone ?? <span className="text-ink-muted">{tProfile("noPhone")}</span>}
                    </InfoRow>
                    <InfoRow icon={CalendarClock} label={t("cols.lastLogin")}>
                      {user.lastLoginAt ? when(user.lastLoginAt) : <span className="text-ink-muted">{t("never")}</span>}
                    </InfoRow>
                    <InfoRow icon={UserPlus} label={t("detail.createdAt")}>
                      {when(user.createdAt)}
                      {user.createdBy && <span className="block text-xs text-ink-muted">{`${t("detail.createdBy")}: ${user.createdBy.name}`}</span>}
                    </InfoRow>
                  </div>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink">{t("detail.projects")}</h2>
                  {user.projectsInCharge.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t("detail.noProjects")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {user.projectsInCharge.map((p) => (
                        <li key={p.id}>
                          <Link href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 transition-colors hover:border-accent/50">
                            <Building2 size={16} className="shrink-0 text-accent" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                              <span className="block text-xs text-ink-muted">
                                {tProjectStatus(p.status)} · {p.municipality} · {format.number(p.progressPercentage, { maximumFractionDigits: 0 })}%
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="rounded-xl border border-line bg-surface p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink">{t("detail.activity")}</h2>
                  <Link href={{ pathname: "/audit", query: { actorId: user.id } }} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    {t("detail.seeHistory")} <ArrowRight size={13} aria-hidden />
                  </Link>
                </div>
                {user.recentActivity.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("detail.noActivity")}</p>
                ) : (
                  <ol className="relative space-y-3 border-l border-line pl-5">
                    {user.recentActivity.map((entry) => (
                      <li key={entry.id} className="relative">
                        <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${actionTone(entry.action)}`} aria-hidden />
                        <p className="text-sm text-ink">{labels.action(entry.action)}</p>
                        <p className="text-xs text-ink-muted">
                          {entry.actorId !== user.id && `${labels.actor(entry)} · `}
                          {labels.moment(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </RevealItem>
        </Reveal>
      </main>

      <Modal open={editing} onClose={() => setEditing(false)} title={t("form.editTitle")} size="lg">
        {editing && <UserForm user={user} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />}
      </Modal>
      {dialogs}
    </>
  );
}

/** User detail (CSR, admin only, dynamic route). */
export default function UserDetailPage() {
  return (
    <AdminOnly>
      <UserDetailScreen />
    </AdminOnly>
  );
}
