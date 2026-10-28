import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaItem } from "../api";
import { copy, formatPostedAt } from "../i18n";

const SWIPE_THRESHOLD_PX = 50;
const ZOOM_SCALE = 2;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP_PX = 40;
const DRAG_SLOP_PX = 10;

function wrapIndex(index: number, length: number) {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function panLimits(img: HTMLImageElement | null, scale: number) {
  if (!img || scale <= 1) return { x: 0, y: 0 };
  return {
    x: (img.clientWidth * (scale - 1)) / 2,
    y: (img.clientHeight * (scale - 1)) / 2,
  };
}

function clampOffset(x: number, y: number, scale: number, img: HTMLImageElement | null) {
  const limits = panLimits(img, scale);
  return {
    x: clamp(x, -limits.x, limits.x),
    y: clamp(y, -limits.y, limits.y),
  };
}

function ZoomablePhoto({
  src,
  onSwipePrev,
  onSwipeNext,
}: {
  src: string;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const gestureRef = useRef<{ startX: number; startY: number; moved: boolean; pointerId: number } | null>(null);

  useEffect(() => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
    lastTapRef.current = null;
    gestureRef.current = null;
  }, [src]);

  const isZoomed = scale > 1;

  const applyPan = useCallback((x: number, y: number, nextScale = scaleRef.current) => {
    const next = clampOffset(x, y, nextScale, imgRef.current);
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number) => {
    if (scaleRef.current > 1) {
      scaleRef.current = 1;
      offsetRef.current = { x: 0, y: 0 };
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const img = imgRef.current;
    if (!img) {
      scaleRef.current = ZOOM_SCALE;
      setScale(ZOOM_SCALE);
      return;
    }

    const rect = img.getBoundingClientRect();
    const relX = clientX - (rect.left + rect.width / 2);
    const relY = clientY - (rect.top + rect.height / 2);
    const x = -relX * (ZOOM_SCALE - 1);
    const y = -relY * (ZOOM_SCALE - 1);
    const nextOffset = clampOffset(x, y, ZOOM_SCALE, img);
    scaleRef.current = ZOOM_SCALE;
    offsetRef.current = nextOffset;
    setScale(ZOOM_SCALE);
    setOffset(nextOffset);
  }, []);

  const onDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    };

    if (scaleRef.current > 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) > DRAG_SLOP_PX) {
      gesture.moved = true;
    }

    const drag = dragRef.current;
    if (!drag || scaleRef.current <= 1) return;
    applyPan(
      drag.originX + (event.clientX - drag.startX),
      drag.originY + (event.clientY - drag.startY),
    );
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;

    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    if (gesture.moved) {
      if (scaleRef.current <= 1) {
        const delta = event.clientX - gesture.startX;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
          if (delta < 0) onSwipeNext();
          else onSwipePrev();
        }
      }
      lastTapRef.current = null;
      return;
    }

    if (event.pointerType === "touch") {
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time <= DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) <= DOUBLE_TAP_SLOP_PX
      ) {
        lastTapRef.current = null;
        zoomAt(event.clientX, event.clientY);
        return;
      }
      lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
    }
  };

  return (
    <div
      className={`viewer__photo${isZoomed ? " viewer__photo--zoomed" : ""}${dragging ? " viewer__photo--dragging" : ""}`}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="viewer__photo-transform"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
        }}
      >
        <img ref={imgRef} src={src} alt="" draggable={false} />
      </div>
    </div>
  );
}

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
  const hasSiblings = items.length > 1;
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(
    () => onIndex(wrapIndex(index + 1, items.length)),
    [index, items.length, onIndex],
  );
  const goPrev = useCallback(
    () => onIndex(wrapIndex(index - 1, items.length)),
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    document.body.classList.add("viewer-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("viewer-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [goNext, goPrev, onClose]);

  const onStageTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onStageTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  if (!item) return null;

  const isPhoto = item.kind === "photo";

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={item.displayName}>
      <div className="viewer__backdrop" aria-hidden="true" />
      <button type="button" className="viewer__close" onClick={onClose} aria-label={copy.close}>
        ×
      </button>
      {hasSiblings ? (
        <button
          type="button"
          className="viewer__nav viewer__prev"
          onClick={goPrev}
          aria-label={copy.previous}
        >
          ‹
        </button>
      ) : null}
      <figure
        className="viewer__stage"
        onTouchStart={isPhoto ? undefined : onStageTouchStart}
        onTouchEnd={isPhoto ? undefined : onStageTouchEnd}
      >
        {isPhoto ? (
          <ZoomablePhoto src={item.fileUrl} onSwipePrev={goPrev} onSwipeNext={goNext} />
        ) : (
          <VideoFrame item={item} />
        )}
        <figcaption>
          <span className="tile__name">{item.displayName}</span>
          <time dateTime={item.createdAt}>{formatPostedAt(item.createdAt)}</time>
        </figcaption>
      </figure>
      {hasSiblings ? (
        <>
          <button
            type="button"
            className="viewer__nav viewer__next"
            onClick={goNext}
            aria-label={copy.next}
          >
            ›
          </button>
          <p className="viewer__counter">
            {index + 1} / {items.length}
          </p>
        </>
      ) : null}
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
