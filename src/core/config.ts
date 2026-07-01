import { z } from "zod";

/** Plugin settings schema (CF, 5.2). */
export const configSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    targetFields: z.array(z.string().min(1)).min(1),
    dataField: z.string(),
  }),
});

export type PluginConfig = z.infer<typeof configSchema>;

export const CONFIG_KEY = "config";

/**
 * Parse the stored config JSON. Returns null for missing, non-JSON, or invalid
 * values (empty targetFields, wrong version), so callers treat the plugin as
 * unconfigured and do nothing on record screens (TC-19, common spec 4).
 */
export function parseConfig(raw: string | undefined | null): PluginConfig | null {
  if (!raw || raw.trim() === "") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = configSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Read config from a kintone plugin config object (`getConfig` result). */
export function parsePluginConfig(
  configObject: Record<string, string> | undefined,
): PluginConfig | null {
  return parseConfig(configObject?.[CONFIG_KEY]);
}

export function serializeConfig(config: PluginConfig): Record<string, string> {
  return { [CONFIG_KEY]: JSON.stringify(config) };
}
