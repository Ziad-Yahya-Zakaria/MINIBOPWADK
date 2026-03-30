/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTANCE_ID?: string;
  readonly VITE_BOOTSTRAP_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
