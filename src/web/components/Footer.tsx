import { Ornament } from "./Chrome";
import { useWeddingConfig } from "../config";
import { copy } from "../i18n";
import footerDesktop from "../assets/footer/footer-desktop.webp";
import footerMobile from "../assets/footer/footer-mobile.webp";

export function Footer() {
  const config = useWeddingConfig();

  return (
    <footer className="site-footer page-enter">
      <div className="footer-divider" aria-hidden="true">
        <span />
      </div>
      <div className="footer-hero">
        <div className="footer-photos" aria-hidden="true">
          <picture>
            <source media="(min-width: 800px)" srcSet={footerDesktop} />
            <img className="footer-photos__img" src={footerMobile} alt="" loading="lazy" decoding="async" />
          </picture>
        </div>
        <div className="footer-hero__overlay" aria-hidden="true" />
        <p className="visually-hidden">{copy.footerPhotoAlt}</p>
        <div className="footer-hero__corners" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="footer-signoff">
          {config.date ? <p className="footer-date">{config.date}</p> : null}
          <Ornament />
          <FooterTitle title={config.title} />
        </div>
      </div>
    </footer>
  );
}

function FooterTitle({ title }: { title: string }) {
  const amp = " & ";
  const index = title.indexOf(amp);
  if (index > 0) {
    return (
      <p className="footer-names">
        <span>{title.slice(0, index)}</span> <span className="name-amp">&amp;</span>{" "}
        <span>{title.slice(index + amp.length)}</span>
      </p>
    );
  }
  return <p className="footer-names">{title}</p>;
}
