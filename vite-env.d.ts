// FIX: Manually define essential types to resolve 'Cannot find type definition file for vite/client' error
// and to support the 'process.env' variables injected via vite.config.ts.

interface ImportMetaEnv {
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var process: {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    API_KEY: string;
    [key: string]: string | undefined;
  };
};
