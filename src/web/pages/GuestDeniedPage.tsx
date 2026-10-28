import { useEffect } from "react";
import { Ornament } from "../components/Chrome";
import { useWeddingConfig } from "../config";
import { copy } from "../i18n";

export function GuestDeniedPage() {
  const config = useWeddingConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("tresc")?.scrollTo(0, 0);
  }, []);

  return (
    <section className="section">
      <div className="section-inner narrow">
        <p className="kicker">{copy.guestDeniedKicker}</p>
        <Ornament />
        <h1>{copy.guestDeniedTitle}</h1>
        <p className="lead">{copy.guestDeniedLead}</p>
        <div className="empty-card">
          <p>{copy.guestDeniedBody}</p>
          {config.date ? <p className="fine-print">{config.date}</p> : null}
        </div>
      </div>
    </section>
  );
}
