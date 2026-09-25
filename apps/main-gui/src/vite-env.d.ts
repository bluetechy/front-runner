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
  /* Where the provider runs account linking, with {provider} standing in for
   * the alias. The one address here that discovery does not publish, because
   * linking is nobody's standard; empty means the provider has none and the
   * security page's SSO card offers no Connect. */
  readonly VITE_IDP_LINK_PATH: string;
  readonly VITE_GRAPHQL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
