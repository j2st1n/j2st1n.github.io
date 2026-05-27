/// <reference types="astro/client" />

declare module "astro:env/client" {
  export const PUBLIC_GOOGLE_SITE_VERIFICATION: string | undefined;
  export const PUBLIC_GISCUS_REPO: string | undefined;
  export const PUBLIC_GISCUS_REPO_ID: string | undefined;
  export const PUBLIC_GISCUS_CATEGORY: string | undefined;
  export const PUBLIC_GISCUS_CATEGORY_ID: string | undefined;
  export const PUBLIC_GISCUS_MAPPING: string | undefined;
  export const PUBLIC_GISCUS_STRICT: string | undefined;
  export const PUBLIC_GISCUS_REACTIONS_ENABLED: string | undefined;
  export const PUBLIC_GISCUS_INPUT_POSITION: string | undefined;
  export const PUBLIC_GISCUS_LANG: string | undefined;
  export const PUBLIC_GISCUS_LOADING: string | undefined;
  export const PUBLIC_GISCUS_ORIGIN: string | undefined;
  export const PUBLIC_GISCUS_EMIT_METADATA: string | undefined;
  export const PUBLIC_GISCUS_TERM: string | undefined;
  export const PUBLIC_GISCUS_ENABLED: string | undefined;
}

interface Window {
  theme?: {
    themeValue: string;
    setPreference: () => void;
    reflectPreference: () => void;
    getTheme: () => string;
    setTheme: (val: string) => void;
  };
}
