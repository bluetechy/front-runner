import { Link } from "@tanstack/react-router";
import "./site-header.css";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/implementation", label: "Implementation" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link to="/" className="site-header__logo">
          YourLogo
        </Link>

        <nav className="site-nav" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="site-nav__link"
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          {/* Sign-in goes to Keycloak once the flow is wired up. */}
          <a className="site-header__signin" href="#sign-in">
            Sign In
          </a>
          <button
            type="button"
            className="site-header__search"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  );
}
