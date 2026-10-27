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

  useEffect(() => {
    adminSession()
      .then((ok) => setState(ok ? "in" : "anon"))
      .catch(() => setState("anon"));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await adminLogin(password);
      setPassword("");
      setState("in");
      setToken((value) => value + 1);
    } catch {
      setError(copy.loginError);
    }
  }

  async function logout() {
    await adminLogout();
    setState("anon");
  }

  if (state === "loading") {
    return (
      <section className="section">
        <p className="status">{copy.loading}</p>
      </section>
    );
  }

  if (state === "anon") {
    return (
      <section className="section">
        <div className="section-inner narrow">
          <div className="notice-card">
            <form className="notice-card__inner upload-form" onSubmit={(event) => void login(event)}>
              <p className="kicker">{copy.adminKicker}</p>
              <Ornament />
              <h1>{copy.adminTitle}</h1>
              <label>
                {copy.passwordLabel}
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit">
                {copy.login}
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await adminMedia());
      setError(null);
    } catch {
      setError(copy.loadError);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  async function toggleHidden(item: MediaItem) {
    await setHidden(item.id, !item.hidden);
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, hidden: !entry.hidden } : entry)));
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(copy.removeConfirm)) return;
    try {
      await deleteMedia(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setError(null);
    } catch {
      setError(copy.removeFailed);
    }
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
          <button type="button" className="btn btn-ghost" onClick={() => void onLogout()}>
            {copy.logout}
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {items.length === 0 ? (
          <p className="status">{copy.adminEmpty}</p>
        ) : (
          <p className="gallery-bar__count admin-summary">
            {formatAdminSummary(items.length, items.filter((item) => item.hidden).length)}
          </p>
        )}
        <ul className="admin-list">
          {items.map((item) => (
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
              <div>
                <p className="tile__name">{item.displayName}</p>
                <p className="admin-meta">
                  <time dateTime={item.createdAt}>{formatPostedAt(item.createdAt)}</time>
                  {" · "}
                  {item.kind === "video" ? copy.video : copy.photo}
                  {" · "}
                  {item.hidden ? copy.hidden : copy.visible}
                </p>
              </div>
              <div className="actions">
                <a className="btn btn-ghost" href={item.fileUrl} target="_blank" rel="noreferrer">
                  {copy.open}
                </a>
                <button type="button" className="btn btn-ghost" onClick={() => void toggleHidden(item)}>
                  {item.hidden ? copy.unhide : copy.hide}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => void remove(item)}>
                  {copy.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
