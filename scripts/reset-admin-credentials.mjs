#!/usr/bin/env node
/**
 * Safe owner-controlled PostgreSQL admin credential reset.
 *
 * This script does not touch application code, audit logic, scoring, providers,
 * or Cloudflare configuration. It only creates/resets one administrator account
 * in the existing PostgreSQL admin_users table and revokes that account's sessions.
 *
 * Usage:
 *   $env:DATABASE_URL = "postgresql://..."
 *   node scripts/reset-admin-credentials.mjs
 *
 * The username/password are entered interactively and never printed or stored
 * by this script in plaintext.
 */
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Provide your existing PostgreSQL/Supabase connection string in the environment.');
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
try {
  const username = (await rl.question('New administrator username: ')).trim();
  const password = await rl.question('New administrator password: ', { hideEchoBack: true });
  const confirmation = await rl.question('Confirm administrator password: ', { hideEchoBack: true });

  if (!/^[a-zA-Z0-9._\-@]{3,64}$/.test(username)) {
    throw new Error('Username must be 3-64 characters and may contain only letters, numbers, ., _, -, and @.');
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }
  const weak = new Set(['admin','password','password123','admin123','123456','12345678','admin2026','adminsecurity2026!']);
  if (weak.has(password.toLowerCase())) {
    throw new Error('Choose a stronger administrator password.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
  const clientId = `usr_admin_${crypto.randomUUID()}`;

  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM admin_users WHERE username = $1 LIMIT 1', [username]);
    if (existing.rows.length) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE admin_users
            SET password_hash = $1,
                password_salt = $2,
                role = 'admin',
                status = 'active',
                updated_at = NOW()
          WHERE id = $3`,
        [hash, salt, id]
      );
      await client.query('UPDATE admin_sessions SET revoked_at = NOW() WHERE username = $1 AND revoked_at IS NULL', [username]);
      console.log(`Administrator credentials reset successfully for username: ${username}`);
    } else {
      await client.query(
        `INSERT INTO admin_users
          (id, username, password_hash, password_salt, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'admin', 'active', NOW(), NOW())`,
        [clientId, username, hash, salt]
      );
      console.log(`Administrator account created successfully for username: ${username}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
} finally {
  rl.close();
}
