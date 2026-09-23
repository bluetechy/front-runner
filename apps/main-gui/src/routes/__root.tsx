import { Outlet, createRootRoute } from "@tanstack/react-router";
import { CookieConsentProvider, CookieNotice } from "../cookie-consent";

/*
 * The outlet, and the one thing that belongs to both halves of the product.
 *
 * There are two shells under this and they never appear together: `_site`
 * wraps the marketing pages in `site-chrome`, and `_app` wraps the
 * application in `app-chrome`. Neither of them is here, for that reason.
 *
 * The cookie notice is the exception, and it is the exception on purpose: a
 * visitor who answers it on the pricing page has answered it for the
 * dashboard too, so asking from inside either shell would be asking twice.
 * It is mounted inside the router rather than in `main.tsx` because the pill
 * it leaves behind has to know which shell is drawn -- behind the login the
 * rail owns the corner it sits in.
 */
export const Route = createRootRoute({ component: Root });

function Root() {
  return (
    <CookieConsentProvider>
      <Outlet />
      <CookieNotice />
    </CookieConsentProvider>
  );
}
