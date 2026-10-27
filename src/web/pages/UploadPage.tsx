import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MAX_SOURCE_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  videoContentTypeForFile,
} from "../../shared/limits";
import { ApiError, completeUpload, createUpload, putBlob } from "../api";
import { Ornament } from "../components/Chrome";
import { copy, formatRemovePreview, formatSubmit, messageForError } from "../i18n";
import { compressPhoto } from "../lib/compressPhoto";
import { inspectVideo } from "../lib/inspectVideo";

interface PreparedFile {
  id: string;
  name: string;
  kind: "photo" | "video";
  contentType: string;
  file: Blob;
  thumb: Blob | null;
  previewUrl: string | null;
  error: string | null;
}

const NAME_KEY = "wedding-guest-name";

export function UploadPage() {
  const [name, setName] = useState(readSavedName);
  const [prepared, setPrepared] = useState<PreparedFile[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [preparing, setPreparing] = useState(false);
  const preparedRef = useRef(prepared);
  preparedRef.current = prepared;

  useEffect(() => () => revokePreviews(preparedRef.current), []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("tresc")?.scrollTo(0, 0);
  }, []);

  const sendable = useMemo(() => prepared.filter((item) => item.error == null).length, [prepared]);
  const canSend = sendable > 0 && !busy && !preparing;

  function reset() {
    revokePreviews(prepared);
    setPrepared([]);
    setProgress({});
    setDone(false);
    setFormError(null);
  }

  function removePrepared(id: string) {
    if (busy) return;
    setPrepared((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
    setProgress((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    reset();
    setPreparing(true);
    const next: PreparedFile[] = [];
    for (const file of Array.from(list)) {
      const item = await prepareFile(file);
      next.push({ ...item, previewUrl: item.thumb ? URL.createObjectURL(item.thumb) : null });
    }
    setPrepared(next);
    setPreparing(false);
  }

  async function submit() {
    setBusy(true);
    setFormError(null);
    setDone(false);
    sessionStorage.setItem(NAME_KEY, name);
    let sent = 0;

    for (const item of prepared) {
      if (item.error) continue;
      try {
        setProgress((current) => ({ ...current, [item.id]: 0.02 }));
        const created = await createUpload({
          guestName: name,
          tableNumber: null,
          kind: item.kind,
          contentType: item.contentType,
          byteSize: item.file.size,
        });
        await putBlob(created.upload, item.file, (ratio) => {
          setProgress((current) => ({ ...current, [item.id]: item.thumb ? ratio * 0.8 : ratio }));
        });
        if (item.thumb && created.thumb) {
          await putBlob(created.thumb, item.thumb, (ratio) => {
            setProgress((current) => ({ ...current, [item.id]: 0.8 + ratio * 0.2 }));
          });
        }
        await completeUpload(created.id);
        setProgress((current) => ({ ...current, [item.id]: 1 }));
        sent += 1;
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "upload_failed";
        setPrepared((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, error: messageForError(code) } : entry)),
        );
      }
    }

    setBusy(false);
    if (sent > 0) setDone(true);
  }

  const failed = prepared.filter((item) => item.error != null);

  return (
    <section className="section section--upload">
      <div className="section-inner narrow">
        <p className="kicker">{copy.uploadKicker}</p>
        <Ornament />
        <h1>{copy.uploadTitle}</h1>
        {done ? (
          <div className="success-panel" role="status">
            <span className="success-panel__mark" aria-hidden="true" />
            <p className="success-panel__title">{copy.uploadedTitle}</p>
            <p className="notice-body">{copy.uploaded}</p>
            {failed.length > 0 ? (
              <ul className="file-errors">
                {failed.map((item) => (
                  <li key={item.id}>
                    {item.name}: {item.error}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="actions actions--center">
              <Link className="btn btn-primary" to="/">
                {copy.backToGallery}
              </Link>
              <button className="btn btn-ghost" type="button" onClick={reset}>
                {copy.uploadMore}
              </button>
            </div>
          </div>
        ) : (
          <>
            <form
              className="upload-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className={`dropzone${prepared.length > 0 ? " dropzone--compact" : ""}`}>
                <span className="dropzone__inner">
                  <span className="dropzone__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8h5.4L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                      <circle cx="12" cy="12.5" r="3.4" />
                    </svg>
                  </span>
                  <span className="dropzone__title">
                    {preparing ? copy.loading : prepared.length > 0 ? copy.fileReplace : copy.fileButton}
                  </span>
                </span>
                {preparing ? (
                  <span className="dropzone__spinner" role="status" aria-label={copy.loading}>
                    <span className="spinner" aria-hidden="true" />
                  </span>
                ) : prepared.length === 0 ? (
                  <span className="dropzone__hint">{copy.fileButtonHint}</span>
                ) : null}
                <input
                  aria-label={copy.fileLabel}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  multiple
                  disabled={busy || preparing}
                  onChange={(event) => {
                    void onFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {prepared.length > 0 ? (
                <ul className="preview-grid">
                  {prepared.map((item) => {
                    const ratio = progress[item.id];
                    return (
                      <li key={item.id} className={item.error ? "is-error" : ratio === 1 ? "is-done" : undefined}>
                        <span className="preview-grid__frame">
                          {!busy ? (
                            <button
                              type="button"
                              className="preview-grid__remove"
                              aria-label={formatRemovePreview(item.name)}
                              onClick={() => removePrepared(item.id)}
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          ) : null}
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt="" />
                          ) : (
                            <span className="tile__play" aria-hidden="true">
                              <span />
                            </span>
                          )}
                          {!item.error && ratio != null && ratio < 1 ? (
                            <span className="progress" aria-hidden="true">
                              <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                            </span>
                          ) : null}
                          {ratio === 1 && !item.error ? <span className="preview-grid__check" aria-hidden="true" /> : null}
                        </span>
                        <span className="preview-grid__name">{item.error ?? item.name}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <label>
                {copy.nameLabel}
                <input
                  value={name}
                  maxLength={40}
                  autoComplete="name"
                  placeholder={copy.namePlaceholder}
                  onChange={(event) => setName(event.target.value)}
                />
                <span className="field-hint">{copy.nameHint}</span>
              </label>
              {formError ? <p className="form-error">{formError}</p> : null}
              <div className="actions actions--stack">
                <button
                  className={`btn btn-primary btn-lg${busy ? " btn--loading" : ""}`}
                  type="submit"
                  disabled={!canSend || busy}
                  aria-busy={busy}
                >
                  {busy ? (
                    <>
                      <span className="spinner spinner--light" aria-hidden="true" />
                      <span className="visually-hidden">{copy.sending}</span>
                    </>
                  ) : (
                    formatSubmit(sendable)
                  )}
                </button>
                {prepared.length > 0 && !busy ? (
                  <button className="link-btn" type="button" onClick={reset}>
                    {copy.clear}
                  </button>
                ) : null}
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

async function prepareFile(file: File): Promise<Omit<PreparedFile, "previewUrl">> {
  const id = crypto.randomUUID();
  const videoType = videoContentTypeForFile(file.type, file.name);
  if (videoType) {
    if (file.size > MAX_VIDEO_BYTES) {
      return { id, name: file.name, kind: "video", contentType: videoType, file, thumb: null, error: copy.fileTooBig };
    }
    try {
      await inspectVideo(file);
      return { id, name: file.name, kind: "video", contentType: videoType, file, thumb: null, error: null };
    } catch (error) {
      const code = error instanceof Error ? error.message : "unreadable";
      return {
        id,
        name: file.name,
        kind: "video",
        contentType: videoType,
        file,
        thumb: null,
        error: code === "too_long" ? copy.videoTooLong : copy.unreadable,
      };
    }
  }

  if (!isImage(file)) {
    return {
      id,
      name: file.name,
      kind: "photo",
      contentType: "image/jpeg",
      file,
      thumb: null,
      error: copy.unsupported,
    };
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    return {
      id,
      name: file.name,
      kind: "photo",
      contentType: "image/jpeg",
      file,
      thumb: null,
      error: copy.sourcePhotoTooBig,
    };
  }
  try {
    const compressed = await compressPhoto(file);
    return {
      id,
      name: file.name,
      kind: "photo",
      contentType: "image/jpeg",
      file: compressed.image,
      thumb: compressed.thumb,
      error: null,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "unreadable";
    return {
      id,
      name: file.name,
      kind: "photo",
      contentType: "image/jpeg",
      file,
      thumb: null,
      error: code === "photo_too_big" || code === "source_too_big" ? copy.photoTooBig : copy.unreadable,
    };
  }
}

function revokePreviews(items: PreparedFile[]) {
  for (const item of items) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
}

function isImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function readSavedName(): string {
  try {
    return sessionStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
