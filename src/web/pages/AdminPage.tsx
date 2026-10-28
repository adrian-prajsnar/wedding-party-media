import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  adminLogin,
  adminLogout,
  adminMedia,
  adminSession,
  deleteMedia,
  setHidden,
  type MediaItem,
} from "../api";
import { Ornament } from "../components/Chrome";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DownloadIcon, ExpandIcon, EyeIcon, EyeOffIcon, TrashIcon } from "../components/Icons";
import { Viewer } from "../components/Viewer";
import { PageLoading } from "../components/LoadingState";
import { copy, formatAdminSummary, formatPostedAt } from "../i18n";

export function AdminPage() {
  return (
    <AdminGate>
      {(reloadToken, logout) => <AdminList reloadToken={reloadToken} onLogout={logout} />}
    </AdminGate>
  );
}

export function AdminGate({ children }: { children: (reloadToken: number, logout: () => Promise<void>) => ReactNode }) {
  const [state, setState] = useState<"loading" | "anon" | "in">("loading");
  const [token, setToken] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    adminSession()
      .then((ok) => setState(ok ? "in" : "anon"))
      .catch(() => setState("anon"));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoggingIn(true);
    try {
      await adminLogin(password);
      setPassword("");
      setState("in");
      setToken((value) => value + 1);
    } catch {
      setError(copy.loginError);
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await adminLogout();
    setState("anon");
  }

  if (state === "loading") {
    return <PageLoading />;
  }

  if (state === "anon") {
    return (
      <section className="section">
        <div className="section-inner narrow">
          <div className="notice-card login-card">
            <form className="notice-card__inner login-form" onSubmit={(event) => void login(event)}>
              <div className="login-form__intro">
                <p className="kicker">{copy.adminLoginKicker}</p>
                <Ornament />
                <h1>{copy.adminLoginTitle}</h1>
                <p className="lead">{copy.adminLoginLead}</p>
                <p className="login-form__note">{copy.adminLoginNote}</p>
              </div>
              <label>
                {copy.passwordLabel}
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  disabled={loggingIn}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button
                className={`btn btn-primary${loggingIn ? " btn--loading" : ""}`}
                type="submit"
                disabled={loggingIn}
                aria-busy={loggingIn}
              >
                {loggingIn ? (
                  <>
                    <span className="spinner spinner--light" aria-hidden="true" />
                    <span className="visually-hidden">{copy.loading}</span>
                  </>
                ) : (
                  copy.login
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return <>{children(token, logout)}</>;
}

function AdminList({ reloadToken, onLogout }: { reloadToken: number; onLogout: () => Promise<void> }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState<MediaItem | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MediaItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [togglingHiddenId, setTogglingHiddenId] = useState<string | null>(null);

  const closePreview = useCallback(() => setPreviewed(null), []);
  const cancelRemoval = useCallback(() => setPendingRemoval(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminMedia());
      setError(null);
    } catch {
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  async function toggleHidden(item: MediaItem) {
    setTogglingHiddenId(item.id);
    try {
      await setHidden(item.id, !item.hidden);
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, hidden: !entry.hidden } : entry)));
    } finally {
      setTogglingHiddenId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await deleteMedia(pendingRemoval.id);
      setItems((current) => current.filter((entry) => entry.id !== pendingRemoval.id));
      setError(null);
    } catch {
      setError(copy.removeFailed);
    } finally {
      setRemoving(false);
      setPendingRemoval(null);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  return (
    <section className="section">
      <div className="section-inner">
        <p className="kicker">{copy.adminKicker}</p>
        <Ornament />
        <h1>{copy.adminTitle}</h1>
        <p className="lead">{copy.adminLead}</p>
        <div className="actions actions--center">
          <Link className="btn btn-primary" to="/admin/qr">
            {copy.qrLink}
          </Link>
          <button
            type="button"
            className={`btn btn-ghost${loggingOut ? " btn--loading" : ""}`}
            disabled={loggingOut}
            aria-busy={loggingOut}
            onClick={() => void handleLogout()}
          >
            <span className="btn__label">{copy.logout}</span>
            {loggingOut ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span className="visually-hidden">{copy.loading}</span>
              </>
            ) : null}
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {items.length === 0 ? (
          <p className="status">{copy.adminEmpty}</p>
        ) : (
          <>
            <p className="gallery-bar__count admin-summary">
              {formatAdminSummary(items.length, items.filter((item) => item.hidden).length)}
            </p>
            <ul className="admin-list">
              {items.map((item) => {
                const togglingHidden = togglingHiddenId === item.id;
                return (
                <li key={item.id} className={item.hidden ? "is-hidden" : undefined}>
              <span className="admin-thumb" aria-hidden="true">
                {item.thumbUrl ? (
                  <img src={item.thumbUrl} alt="" loading="lazy" />
                ) : (
                  <span className="tile__play">
                    <span />
                  </span>
                )}
              </span>
              <div className="admin-info">
                <div className="admin-info__head">
                  <p className="tile__name">{item.displayName}</p>
                  <span
                    className={`admin-badge${item.hidden ? "" : " admin-badge--reserved"}`}
                    aria-hidden={!item.hidden}
                  >
                    <EyeOffIcon />
                    {copy.hidden}
                  </span>
                </div>
                <p className="admin-meta">
                  <time dateTime={item.createdAt}>{formatPostedAt(item.createdAt)}</time>
                  {" · "}
                  {item.kind === "video" ? copy.video : copy.photo}
                </p>
              </div>
              <div className="actions admin-item-actions">
                <button
                  type="button"
                  className={`btn btn-tonal admin-action--toggle ${item.hidden ? "btn-tonal--success" : "btn-tonal--gold"}${togglingHidden ? " btn--loading" : ""}`}
                  disabled={togglingHidden}
                  aria-busy={togglingHidden}
                  onClick={() => void toggleHidden(item)}
                >
                  <span className="btn__label">
                    {item.hidden ? <EyeIcon /> : <EyeOffIcon />}
                    {item.hidden ? copy.unhide : copy.hide}
                  </span>
                  {togglingHidden ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      <span className="visually-hidden">{copy.loading}</span>
                    </>
                  ) : null}
                </button>
                <button type="button" className="btn btn-tonal" onClick={() => setPreviewed(item)}>
                  <ExpandIcon />
                  {copy.open}
                </button>
                <a className="btn btn-tonal" href={item.fileUrl} download={item.displayName}>
                  <DownloadIcon />
                  {copy.download}
                </a>
                <button
                  type="button"
                  className="btn btn-tonal btn-tonal--danger"
                  onClick={() => setPendingRemoval(item)}
                >
                  <TrashIcon />
                  {copy.remove}
                </button>
              </div>
                </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {previewed ? <Viewer items={[previewed]} index={0} onIndex={closePreview} onClose={closePreview} /> : null}
      {pendingRemoval ? (
        <ConfirmDialog
          title={pendingRemoval.kind === "photo" ? copy.removeTitlePhoto : copy.removeTitleVideo}
          message={
            <>
              {pendingRemoval.kind === "photo" ? copy.removeConfirmPhoto : copy.removeConfirmVideo}{" "}
              <strong>{pendingRemoval.displayName}</strong>
              {copy.removeConfirmTail}
            </>
          }
          confirmLabel={copy.remove}
          busy={removing}
          onConfirm={() => void confirmRemove()}
          onCancel={cancelRemoval}
        />
      ) : null}
    </section>
  );
}
