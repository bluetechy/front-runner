/// <reference types="vite/client" />

/*
 * The configuration Vite inlines at build time. Every value comes from the
 * repository's root .env, which vite.config.ts points `envDir` at, so the
 * addresses here and the ones Compose gives the other services are one list.
 */
interface ImportMetaEnv {
  /* The identity provider's issuer, and nothing else about it: every endpoint
   * the app uses is read from that address's discovery document. See
   * src/authentication/identity-provider.ts. */
  readonly VITE_IDP_ISSUER_URL: string;
  readonly VITE_IDP_CLIENT_ID: string;
  /* Which query parameter names a login provider to go straight on to.
   * Keycloak calls it kc_idp_hint; empty sends no hint at all. */
  readonly VITE_IDP_HINT_PARAMETER: string;
  readonly VITE_GRAPHQL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
