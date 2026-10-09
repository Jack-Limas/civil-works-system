import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "../config/prisma";
import { RequestUser } from "../types/auth";
import {
  crossCheck,
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SettingKey,
  settingValueSchemas,
  Settings,
  UpdateSettingsInput,
} from "../schemas/settings.schema";
import { audit, AUDIT_ACTIONS } from "./audit.service";

const CACHE_TTL_MS = 30_000;
let cache: { value: Settings; expiresAt: number } | null = null;

/** Stored overrides on top of the defaults. A stored value that no longer validates falls back to its default. */
async function load(): Promise<{ effective: Settings; overridden: SettingKey[] }> {
  const rows = await prisma.systemSetting.findMany();
  const effective: Settings = { ...SETTING_DEFAULTS };
  const overridden: SettingKey[] = [];
  for (const row of rows) {
    if (!(SETTING_KEYS as string[]).includes(row.key)) continue;
    const key = row.key as SettingKey;
    const parsed = settingValueSchemas[key].safeParse(row.value);
    if (!parsed.success) {
      console.warn(`[settings] stored value for ${key} is invalid; using the default`);
      continue;
    }
    (effective as Record<SettingKey, string | number>)[key] = parsed.data;
    overridden.push(key);
  }
  // A stored pair that breaks a cross rule (e.g. edited by hand) also falls back
  if (crossCheck(effective).length > 0) {
    console.warn("[settings] stored values break a cross rule; using inventory defaults");
    effective.criticalCoverageDays = SETTING_DEFAULTS.criticalCoverageDays;
    effective.warningCoverageDays = SETTING_DEFAULTS.warningCoverageDays;
  }
  return { effective, overridden };
}

export const settingsService = {
  /**
   * Effective settings for every rule that reads them. Cached briefly and
   * cleared on save; if the database fails the defaults keep the system running.
   */
  async get(): Promise<Settings> {
    if (cache && cache.expiresAt > Date.now()) return cache.value;
    try {
      const { effective } = await load();
      cache = { value: effective, expiresAt: Date.now() + CACHE_TTL_MS };
      return effective;
    } catch (error) {
      console.warn("[settings] could not load settings; using defaults:", error instanceof Error ? error.message.slice(0, 200) : error);
      return { ...SETTING_DEFAULTS };
    }
  },

  /** Screen payload: effective values, defaults and which keys are customised. */
  async describe() {
    const { effective, overridden } = await load();
    return { values: effective, defaults: SETTING_DEFAULTS, overridden };
  },

  async update(input: UpdateSettingsInput, requester: RequestUser) {
    const { effective: current } = await load();
    const next: Settings = { ...current, ...input };
    const issues = crossCheck(next);
    if (issues.length > 0) {
      // Same shape as every other validation error (the global handler turns it into 400)
      throw new ZodError(issues.map((i) => ({ code: "custom", path: [i.path], message: i.message, input: next[i.path] })));
    }

    const changedKeys = SETTING_KEYS.filter((k) => k in input && next[k] !== current[k]);
    if (changedKeys.length === 0) return this.describe();

    const before = Object.fromEntries(changedKeys.map((k) => [k, current[k]]));
    const after = Object.fromEntries(changedKeys.map((k) => [k, next[k]]));
    await prisma.$transaction(async (tx) => {
      for (const key of changedKeys) {
        const value = next[key];
        // Back to the default = no row (the database only holds customisations)
        if (value === SETTING_DEFAULTS[key]) {
          await tx.systemSetting.deleteMany({ where: { key } });
        } else {
          await tx.systemSetting.upsert({
            where: { key },
            create: { key, value: value as Prisma.InputJsonValue, updatedById: requester.sub },
            update: { value: value as Prisma.InputJsonValue, updatedById: requester.sub },
          });
        }
      }
      await audit.record(
        tx,
        { action: AUDIT_ACTIONS.settingsUpdated, entityType: "settings", metadata: { keys: changedKeys, before, after } },
        audit.context(requester)
      );
    });
    cache = null;
    return this.describe();
  },

  /** Removes every customisation; the audit event keeps what the values were. */
  async reset(requester: RequestUser) {
    const { effective, overridden } = await load();
    if (overridden.length > 0) {
      const before = Object.fromEntries(overridden.map((k) => [k, effective[k]]));
      const after = Object.fromEntries(overridden.map((k) => [k, SETTING_DEFAULTS[k]]));
      await prisma.$transaction(async (tx) => {
        await tx.systemSetting.deleteMany({});
        await audit.record(
          tx,
          { action: AUDIT_ACTIONS.settingsReset, entityType: "settings", metadata: { keys: overridden, before, after } },
          audit.context(requester)
        );
      });
    }
    cache = null;
    return this.describe();
  },
};
