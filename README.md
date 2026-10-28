# Wedding guest media

Polish gallery for one wedding. Guests scan one QR code, optionally leave a name, and upload photos or a video of up to one minute. Files are stored in Cloudflare R2. The guest list of uploads is stored in D1.

## Local preview

```bash
npm install
copy .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Open the URL Vite prints. The local admin password is the `ADMIN_PASSWORD` value in `.dev.vars`.

Leave the R2 key fields empty for local development. The browser then uploads through the Worker into Wrangler's local R2. In production, uploads also go through the Worker by default (no R2 CORS or API token permissions needed). Set `R2_PRESIGNED_UPLOAD=true` in Wrangler vars only if you want direct browser-to-R2 uploads with a correctly scoped R2 API token and bucket CORS.

Admin pages:

- `/admin` shows who posted each file and can hide it
- `/admin/qr` prints one QR code for the whole gallery

Change the couple name and the date in `wrangler.jsonc` (`WEDDING_TITLE`, `WEDDING_DATE`). A title containing ` i ` is drawn with a gold "i", for example `Anna i Jan`.

## Deploy

1. Create a Cloudflare account and turn on R2. Cloudflare asks for a card. Staying under 10 GB stored costs $0, and downloads are free.
2. Create a D1 database named `wedding-media` and an R2 bucket named `wedding-media`.
3. Put the real D1 database id into `wrangler.jsonc`.
4. Create an R2 API token that can edit objects in that bucket. Put the token into `.dev.vars` or Wrangler secrets:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put COOKIE_SECRET
npx wrangler secret put GUEST_ACCESS_TOKEN
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_ACCOUNT_ID
```

5. Allow the site origin to upload to the bucket. In the R2 bucket CORS rules, allow `PUT` and `GET` from the production URL, with the header `content-type`.
6. Apply the database migration and deploy:

```bash
npx wrangler d1 migrations apply wedding-media --remote
npm run deploy
```

7. Set `GUEST_ACCESS_TOKEN` to a long random string (for example 32+ characters from a password manager). The QR code at `/admin/qr` then opens a one-time invite link; after scanning, the guest browser keeps a cookie for 30 days. Without that step, `/` and `/upload` show an unauthorized page at `/unauthorized` and the media APIs return `401`. Leave `GUEST_ACCESS_TOKEN` empty in local dev to keep the gallery open.

8. Print the QR code only after the production address is final.

A video longer than 60 seconds or larger than 80 MB is refused. Photos are resized in the browser before upload. An empty name is shown as Anonimowy.
