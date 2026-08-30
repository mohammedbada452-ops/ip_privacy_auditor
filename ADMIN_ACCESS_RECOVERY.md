# Admin Access Recovery

The administrator authentication already uses the existing PostgreSQL `admin_users` table with PBKDF2 password hashing and server-side session cookies.

If the current administrator username/password is unknown, do **not** guess credentials and do not change the public application.

Use the included owner-controlled reset script against the same PostgreSQL/Supabase database:

```powershell
$env:DATABASE_URL = "YOUR_EXISTING_SUPABASE_CONNECTION_STRING"
node scripts/reset-admin-credentials.mjs
```

Choose a new username and a strong password when prompted.

The script only creates or resets the specified administrator account and revokes that account's existing sessions. It does not modify audit logic, scoring, providers, pages, Cloudflare configuration, or application data outside the administrator account/session records.

Do not commit `DATABASE_URL` or the new password to the repository.
