/// <reference types="astro/client" />

declare module "astro:env/client" {
  export const PUBLIC_GOOGLE_SITE_VERIFICATION: string | undefined;
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
