import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { copy } from "../i18n";
import { TrashIcon } from "./Icons";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    document.body.classList.add("viewer-open");
    return () => document.body.classList.remove("viewer-open");
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return createPortal(
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="dialog__backdrop" onClick={busy ? undefined : onCancel} aria-hidden="true" />
      <div className="dialog__panel">
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="actions dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </button>
          <button type="button" className="btn btn-danger-solid" disabled={busy} aria-busy={busy} onClick={onConfirm}>
            <TrashIcon />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
