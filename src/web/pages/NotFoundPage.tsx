import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Ornament } from "../components/Chrome";
import { NotFoundMark } from "../components/Icons";
import { copy } from "../i18n";

export function NotFoundPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("tresc")?.scrollTo(0, 0);
  }, []);

  return (
    <section className="section">
      <div className="section-inner narrow">
        <p className="kicker">{copy.notFoundKicker}</p>
        <Ornament />
        <h1>{copy.notFoundTitle}</h1>
        <p className="lead">{copy.notFoundLead}</p>
        <div className="empty-card">
          <NotFoundMark />
          <p>{copy.notFoundBody}</p>
          <div className="actions actions--center">
            <Link className="btn btn-primary" to="/">
              {copy.notFoundCta}
            </Link>
            <Link className="btn btn-ghost" to="/upload">
              {copy.navUpload}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
