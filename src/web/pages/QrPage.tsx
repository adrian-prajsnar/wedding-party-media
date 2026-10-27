import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { AdminGate } from "./AdminPage";
import { BrandMark, Ornament } from "../components/Chrome";
import { useWeddingConfig } from "../config";
import { copy } from "../i18n";

export function QrPage() {
  return (
    <AdminGate>
      {() => <QrSheet />}
    </AdminGate>
  );
}

function QrSheet() {
  const config = useWeddingConfig();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${window.location.origin}/`;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: "#4f1420", light: "#fffdf9" },
    }).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section">
      <div className="section-inner narrow">
        <div className="no-print">
          <p className="kicker">{copy.qrKicker}</p>
          <Ornament />
          <h1>{copy.qrTitle}</h1>
          <p className="lead">{copy.qrLead}</p>
          <div className="actions actions--center">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              {copy.print}
            </button>
            <Link className="btn btn-ghost" to="/admin">
              {copy.backAdmin}
            </Link>
          </div>
        </div>
        {src ? (
          <div className="qr-single">
            <p className="qr-single__cta">{copy.qrCta}</p>
            <img src={src} alt={copy.qrTitle} />
            {config.date ? <p className="footer-date">{config.date}</p> : null}
            <BrandMark className="footer-mark" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
