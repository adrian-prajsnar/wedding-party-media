import { Link, useLocation } from "react-router-dom";
import { copy } from "../i18n";
import { splitTitle } from "../config";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className}>
      A <span className="name-amp">&amp;</span> A
    </span>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const onAdmin = pathname.startsWith("/admin");

  return (
    <header className="site-header">
      <Link className="nav-brand" to="/">
        <BrandMark />
      </Link>
      {onAdmin ? null : (
        <nav className="site-nav" aria-label="Główne">
          <Link to="/" aria-current={pathname === "/" ? "true" : undefined}>
            {copy.navGallery}
          </Link>
          <Link
            className="site-nav__cta"
            to="/upload"
            aria-current={pathname === "/upload" ? "true" : undefined}
          >
            {copy.navUpload}
          </Link>
        </nav>
      )}
    </header>
  );
}

export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <span className="ornament__diamond" />
    </div>
  );
}

export function CoupleNames({ title }: { title: string }) {
  const names = splitTitle(title);
  if (!names.right) return <p className="footer-names">{names.left}</p>;
  return (
    <p className="footer-names">
      <span>{names.left}</span> <span className="name-amp">i</span> <span>{names.right}</span>
    </p>
  );
}
