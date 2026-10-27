import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaItem } from "../api";
import { copy, formatPostedAt } from "../i18n";

export function Viewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: MediaItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const item = items[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex(Math.min(items.length - 1, index + 1));
      if (event.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    document.body.classList.add("viewer-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("viewer-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={item.displayName}>
      <button type="button" className="viewer__backdrop" aria-label={copy.close} onClick={onClose} />
      <button type="button" className="viewer__close" onClick={onClose} aria-label={copy.close}>
        ×
      </button>
      <button
        type="button"
        className="viewer__nav viewer__prev"
        onClick={() => onIndex(index - 1)}
        disabled={index === 0}
        aria-label={copy.previous}
      >
        ‹
      </button>
      <figure className="viewer__stage">
        {item.kind === "photo" ? (
          <img src={item.fileUrl} alt="" />
        ) : (
          <VideoFrame item={item} />
        )}
        <figcaption>
          <span className="tile__name">{item.displayName}</span>
          <time dateTime={item.createdAt}>{formatPostedAt(item.createdAt)}</time>
        </figcaption>
      </figure>
      <button
        type="button"
        className="viewer__nav viewer__next"
        onClick={() => onIndex(index + 1)}
        disabled={index === items.length - 1}
        aria-label={copy.next}
      >
        ›
      </button>
      <p className="viewer__counter">
        {index + 1} / {items.length}
      </p>
    </div>,
    document.body,
  );
}

function VideoFrame({ item }: { item: MediaItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="viewer__video">
      <video
        key={item.id}
        src={item.fileUrl}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      {failed ? (
        <>
          <p className="viewer__hint">{copy.playbackFailed}</p>
          <a className="viewer__download" href={item.fileUrl} download>
            {copy.download}
          </a>
        </>
      ) : null}
    </div>
  );
}
