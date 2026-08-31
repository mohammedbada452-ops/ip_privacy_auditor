# Admin Access Recovery

The administrator authentication uses the existing `admin_users` model with PBKDF2 password hashing and server-side session cookies.

If the current administrator username/password is unknown, do **not** guess credentials and do not change the public application.

## Cloudflare production configuration

Production administrator credentials are supplied as Cloudflare Worker Secrets, not committed to source code.

From the project directory, configure them interactively:

```powershell
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
```

Optional emergency/break-glass key:

```powershell
npx wrangler secret put ADMIN_SECRET_KEY
```

The existing production configuration also requires the server-side security salt already used by the application:

```powershell
npx wrangler secret put SERVER_SECRET_SALT
```

Do not paste these secret values into source files, Git, reports, screenshots, or chat.

After changing production secrets, deploy the **same application build** through the existing Cloudflare deployment process so the Worker receives the updated secrets. Do not change `wrangler.jsonc` just to configure these values.

## Owner-controlled local reset

If direct PostgreSQL/Supabase access is available, use the included owner-controlled reset script:

```powershell
$env:DATABASE_URL = "YOUR_EXISTING_SUPABASE_CONNECTION_STRING"
node scripts/reset-admin-credentials.mjs
```

Choose a new administrator username and a strong password when prompted.

The script only creates/resets the specified administrator account and revokes that account's existing sessions. It does not modify audit logic, scoring, providers, pages, Cloudflare configuration, or application data outside the administrator account/session records.

## Security model

- No predictable default production credentials are created.
- Passwords are never stored in plaintext.
- Sessions use server-side validation and `HttpOnly` cookies.
- Production cookies use `Secure` and `SameSite=Strict`.
- State-changing admin routes require the existing CSRF protections.
- Failed login attempts remain rate-limited.

Do not commit `DATABASE_URL`, administrator passwords, or secret keys to the repository.
