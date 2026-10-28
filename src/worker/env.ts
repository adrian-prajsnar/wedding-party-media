export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  WEDDING_TITLE: string;
  WEDDING_DATE: string;
  ADMIN_PASSWORD?: string;
  COOKIE_SECRET?: string;
  /** When set (with COOKIE_SECRET), guests need the QR invite link once to receive a cookie. */
  GUEST_ACCESS_TOKEN?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  /** When "true", browsers upload via presigned R2 URLs (needs a scoped R2 API token + CORS). Default: through the Worker. */
  R2_PRESIGNED_UPLOAD?: string;
}
