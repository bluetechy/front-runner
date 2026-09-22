/// <reference types="vite/client" />

/*
 * The configuration Vite inlines at build time. Every value comes from the
 * repository's root .env, which vite.config.ts points `envDir` at, so the
 * addresses here and the ones Compose gives the other services are one list.
 */
interface ImportMetaEnv {
  readonly VITE_KEYCLOAK_URL: string;
  readonly VITE_KEYCLOAK_REALM: string;
  readonly VITE_KEYCLOAK_CLIENT_ID: string;
  readonly VITE_GRAPHQL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
