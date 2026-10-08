"use client";

import { forwardRef, SelectHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { useProjects } from "@/lib/projects-service";
import { fieldClass } from "@/components/ui/form";

type ProjectSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Adds an empty option meaning "no project" instead of a disabled placeholder. */
  allowNone?: boolean;
  /** Text of the empty option when allowNone is set (defaults to "no project"). */
  noneLabel?: string;
};

/**
 * Select fed by GET /projects. The API already scopes the list by role, so a
 * resident only ever sees their own projects here.
 */
export const ProjectSelect = forwardRef<HTMLSelectElement, ProjectSelectProps>(function ProjectSelect(
  { allowNone, noneLabel, className, ...props },
  ref
) {
  const t = useTranslations("projectPicker");
  const tCommon = useTranslations("common");
  const { data, isLoading } = useProjects({ limit: 100 });
  const projects = data?.data ?? [];

  return (
    <select ref={ref} {...props} disabled={isLoading || props.disabled} className={className ?? fieldClass}>
      {allowNone ? (
        <option value="">{noneLabel ?? t("none")}</option>
      ) : (
        <option value="" disabled>
          {isLoading ? tCommon("loading") : projects.length === 0 ? t("empty") : t("placeholder")}
        </option>
      )}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
});
