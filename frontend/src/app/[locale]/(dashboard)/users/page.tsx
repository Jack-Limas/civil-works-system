"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Eye, HardHat, KeyRound, Plus, Power, PowerOff, Search, ShieldCheck, Users, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges";
import { UserForm } from "@/components/users/user-form";
import { TemporaryPasswordDialog } from "@/components/users/temporary-password-dialog";
import { useUserActions } from "@/components/users/use-user-actions";
import { Link } from "@/i18n/navigation";
import { nameInitial } from "@/lib/initials";
import { useUserDirectory, type ManagedUser, type UserFilters } from "@/lib/users-service";
import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/auth";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const n = (v: number) => String(Math.round(v));

function UsersScreen() {
  const t = useTranslations("users");
  const tf = useTranslations("users.filters");
  const tRoles = useTranslations("common.roles");
  const format = useFormatter();
  const meId = useAuthStore((s) => s.user?.id);
  const { ask, dialogs } = useUserActions();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: PAGE_SIZE });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ title: "created"; name: string; password: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() || undefined, page: 1 })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useUserDirectory(filters);
  const update = (patch: Partial<UserFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const kpis = data?.summary;
  const filtered = !!(filters.search || filters.role || filters.status);

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={() => setCreating(true)} className={primaryButtonClass}>
            <Plus size={16} aria-hidden /> {t("newUser")}
          </button>
        }
      />
      <main className="space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard
                label={t("kpis.active")}
                icon={Users}
                tone="success"
                loading={isLoading}
                value={<AnimatedNumber value={kpis?.active ?? 0} format={n} />}
                hint={t("kpis.totalHint", { count: kpis?.inactive ?? 0 })}
              />
              <KpiCard label={t("kpis.admins")} icon={ShieldCheck} tone="ai" loading={isLoading} value={<AnimatedNumber value={kpis?.admins ?? 0} format={n} />} />
              <KpiCard label={t("kpis.residents")} icon={HardHat} tone="accent" loading={isLoading} value={<AnimatedNumber value={kpis?.residents ?? 0} format={n} />} />
              <KpiCard
                label={t("kpis.pendingPassword")}
                icon={KeyRound}
                tone="warning"
                emphasize={(kpis?.pendingPasswordChange ?? 0) > 0}
                loading={isLoading}
                value={<AnimatedNumber value={kpis?.pendingPasswordChange ?? 0} format={n} />}
                hint={t("kpis.pendingPasswordHint")}
              />
            </div>
          </RevealItem>

          <RevealItem>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tf("search")} aria-label={tf("search")} className={`${fieldClass} pl-10`} />
              </div>
              <select aria-label={t("cols.role")} value={filters.role ?? ""} onChange={(e) => update({ role: (e.target.value || undefined) as Role | undefined })} className={fieldClass}>
                <option value="">{tf("allRoles")}</option>
                <option value="ADMIN">{tRoles("ADMIN")}</option>
                <option value="RESIDENT_ENGINEER">{tRoles("RESIDENT_ENGINEER")}</option>
              </select>
              <select
                aria-label={t("cols.status")}
                value={filters.status ?? ""}
                onChange={(e) => update({ status: (e.target.value || undefined) as UserFilters["status"] })}
                className={fieldClass}
              >
                <option value="">{tf("allStatuses")}</option>
                <option value="active">{tf("active")}</option>
                <option value="inactive">{tf("inactive")}</option>
              </select>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilters({ page: 1, limit: PAGE_SIZE });
                  }}
                  className={secondaryButtonClass}
                >
                  <X size={15} aria-hidden /> {tf("clear")}
                </button>
              )}
            </div>
          </RevealItem>

          <RevealItem className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
            <DataTable<ManagedUser>
              rows={data?.data ?? []}
              isLoading={isLoading}
              rowKey={(u) => u.id}
              emptyMessage={filtered ? t("empty") : t("emptyAll")}
              actionsHeader={t("cols.actions")}
              rowActions={(u) => {
                const self = u.id === meId;
                return (
                  <div className="flex justify-end gap-1.5">
                    <Link href={`/users/${u.id}`} className={secondaryButtonClass} aria-label={`${t("actions.view")}: ${u.name}`} title={t("actions.view")}>
                      <Eye size={15} aria-hidden />
                    </Link>
                    {!self && u.isActive && (
                      <button type="button" onClick={() => ask("reset", u)} className={secondaryButtonClass} aria-label={`${t("actions.resetPassword")}: ${u.name}`} title={t("actions.resetPassword")}>
                        <KeyRound size={15} aria-hidden />
                      </button>
                    )}
                    {!self && (
                      <button
                        type="button"
                        onClick={() => ask(u.isActive ? "deactivate" : "activate", u)}
                        className={secondaryButtonClass}
                        aria-label={`${u.isActive ? t("actions.deactivate") : t("actions.activate")}: ${u.name}`}
                        title={u.isActive ? t("actions.deactivate") : t("actions.activate")}
                      >
                        {u.isActive ? <PowerOff size={15} className="text-critical" aria-hidden /> : <Power size={15} className="text-success" aria-hidden />}
                      </button>
                    )}
                  </div>
                );
              }}
              columns={[
                {
                  id: "user",
                  header: t("cols.user"),
                  primary: true,
                  accessor: (u) => (
                    <Link href={`/users/${u.id}`} className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          u.isActive ? "bg-accent/15 text-accent" : "bg-surface-2 text-ink-muted"
                        }`}
                        aria-hidden
                      >
                        {nameInitial(u.name)}
                      </span>
                      <span className="min-w-0">
                        <span className={`flex items-center gap-1.5 truncate font-medium hover:text-accent ${u.isActive ? "text-ink" : "text-ink-muted"}`}>
                          {u.name}
                          {u.id === meId && <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold uppercase text-ink-muted">{t("you")}</span>}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">{u.email}</span>
                      </span>
                    </Link>
                  ),
                },
                { id: "role", header: t("cols.role"), accessor: (u) => <RoleBadge role={u.role} /> },
                { id: "status", header: t("cols.status"), accessor: (u) => <UserStatusBadge isActive={u.isActive} mustChangePassword={u.mustChangePassword} /> },
                {
                  id: "lastLogin",
                  header: t("cols.lastLogin"),
                  accessor: (u) =>
                    u.lastLoginAt ? (
                      <span className="whitespace-nowrap" title={format.dateTime(new Date(u.lastLoginAt), { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" })}>
                        {format.dateTime(new Date(u.lastLoginAt), { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" })}
                      </span>
                    ) : (
                      <span className="text-ink-muted">{t("never")}</span>
                    ),
                },
                { id: "projects", header: t("cols.projects"), align: "right", accessor: (u) => <span className="font-mono-data">{u.projectsInCharge}</span> },
              ]}
            />
          </RevealItem>
        </Reveal>
        {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page })} />}
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title={t("form.createTitle")} size="lg">
        {creating && (
          <UserForm
            user={null}
            onCancel={() => setCreating(false)}
            onCreated={({ name, password }) => {
              setCreating(false);
              setCreated({ title: "created", name, password });
            }}
          />
        )}
      </Modal>
      <TemporaryPasswordDialog data={created} onClose={() => setCreated(null)} />
      {dialogs}
    </>
  );
}

/** User management (CSR, admin only). */
export default function UsersPage() {
  return (
    <AdminOnly>
      <UsersScreen />
    </AdminOnly>
  );
}
