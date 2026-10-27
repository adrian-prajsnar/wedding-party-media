import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { listMedia, type MediaItem } from "../api";
import { copy, formatMemories, formatPostedAt } from "../i18n";
import { Ornament } from "../components/Chrome";
import { useWeddingConfig } from "../config";
import { Viewer } from "../components/Viewer";

const LANDING_INTRO_MS = 3000;

/** Survives client-side navigation; resets on full page load (refresh). */
let landingIntroPlayedThisLoad = false;

function markLandingIntroSeen(): void {
  landingIntroPlayedThisLoad = true;
}

function shouldPlayLandingIntro(): boolean {
  if (landingIntroPlayedThisLoad) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    markLandingIntroSeen();
    return false;
  }
  return true;
}

export function GalleryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [viewer, setViewer] = useState<number | null>(null);
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  const heroCta = useRef<HTMLDivElement>(null);
  const [showLandingIntro] = useState(shouldPlayLandingIntro);

  useEffect(() => {
    if (!showLandingIntro) return;
    const timer = window.setTimeout(markLandingIntroSeen, LANDING_INTRO_MS);
    return () => clearTimeout(timer);
  }, [showLandingIntro]);

  useEffect(() => {
    const target = heroCta.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHeroCtaVisible(entry?.isIntersecting ?? true));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const replace = useCallback(async () => {
    try {
      const page = await listMedia();
      setItems(page.items);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const page = await listMedia();
      setItems((current) => {
        if (current.length === 0) return page.items;
        const ids = new Set(current.map((item) => item.id));
        const added = page.items.filter((item) => !ids.has(item.id));
        return added.length > 0 ? [...added, ...current] : current;
      });
      setStatus("ready");
    } catch {
      setStatus((current) => (current === "loading" ? "error" : current));
    }
  }, []);

  useEffect(() => {
    void replace();
  }, [replace]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [poll]);

  async function loadMore() {
    if (!cursor) return;
    const page = await listMedia(cursor);
    setItems((current) => mergeItems(current, page.items));
    setCursor(page.nextCursor);
  }

  return (
    <section className="section">
      <div className="section-inner">
        {showLandingIntro ? <Monogram /> : null}
        <div className="invite">
          <p className="kicker">{copy.kicker}</p>
          <Ornament />
          <h1>{copy.galleryTitle}</h1>
          <p className="lead">{copy.galleryLead}</p>
          <ul className="notes">
            {copy.galleryNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div ref={heroCta} className="actions actions--center">
            <Link className="btn btn-primary btn-lg" to="/upload">
              <PlusIcon />
              {copy.galleryCta}
            </Link>
          </div>
        </div>

        {status === "error" ? <p className="form-error form-error--center">{copy.loadError}</p> : null}
        {status === "ready" && items.length === 0 ? (
          <div className="empty-card">
            <p className="empty-card__title">{copy.emptyTitle}</p>
            <p>{copy.empty}</p>
            <div className="actions actions--center">
              <Link className="btn btn-primary" to="/upload">
                {copy.emptyCta}
              </Link>
            </div>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="gallery-bar" aria-hidden="true">
            <span className="gallery-bar__skeleton gallery-bar__skeleton--count" />
            <span className="gallery-bar__skeleton gallery-bar__skeleton--action" />
          </div>
        ) : items.length > 0 ? (
          <div className="gallery-bar">
            <p className="gallery-bar__count">{formatMemories(items.length, cursor != null)}</p>
            <button type="button" className="link-btn" onClick={() => void replace()}>
              {copy.refresh}
            </button>
          </div>
        ) : null}

        {status === "loading" ? (
          <ul className="gallery" aria-label={copy.loading}>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <span className="tile tile--skeleton" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="gallery">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="tile"
                  aria-label={`${item.kind === "video" ? copy.video : copy.photo}: ${item.displayName}`}
                  onClick={() => setViewer(index)}
                >
                  {item.kind === "photo" && item.thumbUrl ? (
                    <img src={item.thumbUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="tile__play" aria-hidden="true">
                      <span />
                    </span>
                  )}
                  {item.kind === "video" ? <span className="tile__badge">{copy.video}</span> : null}
                  <span className="tile__meta">
                    <span className="tile__name">{item.displayName}</span>
                    <time dateTime={item.createdAt}>{formatPostedAt(item.createdAt)}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {cursor ? (
          <div className="actions actions--center">
            <button type="button" className="btn btn-ghost" onClick={() => void loadMore()}>
              {copy.loadMore}
            </button>
          </div>
        ) : null}
      </div>
      {items.length > 0 && !heroCtaVisible ? (
        <Link className="fab" to="/upload">
          <PlusIcon />
          {copy.navUpload}
        </Link>
      ) : null}
      {viewer != null ? (
        <Viewer items={items} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
      ) : null}
    </section>
  );
}

function Monogram() {
  const { date } = useWeddingConfig();
  return createPortal(
    <div className="monogram" aria-hidden="true">
      <p className="monogram__letters">
        <span>A</span>
        <span>&amp;</span>
        <span>A</span>
      </p>
      <span className="monogram__rule" />
      {date ? <p className="monogram__date">{date}</p> : null}
    </div>,
    document.body,
  );
}

function PlusIcon() {
  return (
    <svg className="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function mergeItems(current: MediaItem[], incoming: MediaItem[]): MediaItem[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
}
