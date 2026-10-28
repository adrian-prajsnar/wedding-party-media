import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { AdminGate } from "./AdminPage";
import { BrandMark, Ornament } from "../components/Chrome";
import { CameraIcon } from "../components/Icons";
import { adminEntryUrl } from "../api";
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
    adminEntryUrl()
      .then(({ url }) => {
        if (cancelled) return;
        return QRCode.toDataURL(url, {
          margin: 1,
          width: 640,
          color: { dark: "#4f1420", light: "#fffdf9" },
        });
      })
      .then((dataUrl) => {
        if (!cancelled && dataUrl) setSrc(dataUrl);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = `${window.location.origin}/`;
        return QRCode.toDataURL(fallback, {
          margin: 1,
          width: 640,
          color: { dark: "#4f1420", light: "#fffdf9" },
        }).then((dataUrl) => {
          if (!cancelled) setSrc(dataUrl);
        });
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
            <div className="qr-single__frame">
              <span className="qr-single__badge">
                <CameraIcon className="qr-single__icon" />
              </span>
              <h2 className="qr-single__heading">{copy.qrSheetHeading}</h2>
              <p className="qr-single__body">{copy.qrSheetBody}</p>
              <div className="qr-single__code">
                <img src={src} alt={copy.qrTitle} />
              </div>
              <div className="qr-single__footer">
                <BrandMark className="qr-single__mark" />
                {config.date ? <p className="qr-single__date">{config.date}</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
