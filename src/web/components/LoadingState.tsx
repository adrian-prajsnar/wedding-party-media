import { copy } from "../i18n";

export function PageLoading() {
  return (
    <div className="page-loading-screen" role="status" aria-label={copy.loading}>
      <span className="spinner spinner--page" aria-hidden="true" />
    </div>
  );
}
