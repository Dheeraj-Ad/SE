import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createApp } from './app.js';
import { openDatabase, one } from './shared/database.js';
import { createUser } from './shared/auth.js';
import { assert } from './shared/validation.js';

export const DEMO_PASSWORD = 'Lobby@2026!';
export const DEMO_ROLES = ['admin', 'faculty', 'security', 'student'];

// The key is generated during deployment and bundled only with the API function.
// Signed demo sessions work across instances; demo records remain temporary.
export function createDemoApp({ secret, secureCookies = true } = {}) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('A deployment session key is required');
  const sign = payload => createHmac('sha256', secret).update(payload).digest('base64url');
  const sessions = {
    issue(user, csrf, expires) {
      const payload = Buffer.from(JSON.stringify({ email: user.email, csrf, expires, nonce: randomBytes(16).toString('hex') })).toString('base64url');
      return `demo.${payload}.${sign(payload)}`;
    },
    read(ctx, token) {
      const [prefix, payload, signature, extra] = String(token).split('.');
      assert(prefix === 'demo' && payload && signature && !extra, 'Session expired. Please sign in again.', 401);
      const expected = Buffer.from(sign(payload)), actual = Buffer.from(signature);
      assert(actual.length === expected.length && timingSafeEqual(actual, expected), 'Session expired. Please sign in again.', 401);
      let claims;
      try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { assert(false, 'Invalid session', 401); }
      assert(typeof claims?.expires === 'string' && claims.expires > ctx.now() && typeof claims.csrf === 'string', 'Session expired. Please sign in again.', 401);
      const user = one(ctx.db, 'SELECT * FROM users WHERE email=? AND active=1', claims.email);
      assert(user && DEMO_ROLES.some(role => user.email === `${role}@lobby.local`), 'Session expired. Please sign in again.', 401);
      return { user, csrf: claims.csrf };
    },
  };
  const result = createApp({ db: openDatabase(':memory:'), demo: true, demoSessions: sessions, secureCookies, mailer: { mode: 'outbox', send: async () => ({ local: true }) } });
  for (const role of DEMO_ROLES) {
    createUser(result.ctx, null, { name: `${role[0].toUpperCase() + role.slice(1)} Demo`, email: `${role}@lobby.local`, password: DEMO_PASSWORD, role, department: 'Demo campus' });
  }
  return result;
}
