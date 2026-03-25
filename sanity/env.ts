// NOTE:
// Use direct env-property access so Next.js can inline NEXT_PUBLIC_* values in client bundles.
// Dynamic access like process.env[name] can evaluate differently on server vs client and cause hydration mismatches.
const readSanityEnv = () => ({
  apiVersion:
    process.env.NEXT_PUBLIC_SANITY_API_VERSION ||
    process.env.SANITY_STUDIO_NEXT_PUBLIC_SANITY_API_VERSION,
  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    process.env.SANITY_STUDIO_NEXT_PUBLIC_SANITY_DATASET,
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_STUDIO_NEXT_PUBLIC_SANITY_PROJECT_ID,
});

const warnedKeys = new Set<string>();
const requireEnvOr = (value: string | undefined, name: string, fallback: string) => {
  if (value) return value;
  if (!warnedKeys.has(name)) {
    warnedKeys.add(name);
    console.warn(
      `Missing Sanity env var: ${name}. Falling back to "${fallback}". Add it to .env.local (NEXT_PUBLIC_...).`
    );
  }
  return fallback;
};

const sanityEnv = readSanityEnv();

export const apiVersion = sanityEnv.apiVersion || "2024-11-09";
export const dataset = requireEnvOr(sanityEnv.dataset, "NEXT_PUBLIC_SANITY_DATASET", "production");
export const projectId = requireEnvOr(sanityEnv.projectId, "NEXT_PUBLIC_SANITY_PROJECT_ID", "td5crv6z");
