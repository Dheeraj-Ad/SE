import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { all, one, run, transaction, audit } from './database.js';
import { assert, text, requireRole } from './validation.js';

export const digest = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) {
  assert(typeof password === 'string' && password.length >= 10 && password.length <= 128, 'Password must contain 10 to 128 characters');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [salt, hash] = encoded.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}
export const publicUser = user => ({ id:user.id, name:user.name, email:user.email, role:user.role, department:user.department, active:!!user.active });
export function createUser(ctx, actor, data) {
  if (actor) requireRole(actor, 'admin');
  const name = text(data.name, 'Name', 100), email = text(data.email, 'Email').toLowerCase();
  assert(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(email), 'Invalid email address');
  assert(['student','faculty','admin','security'].includes(data.role), 'Invalid role');
  assert(!one(ctx.db, 'SELECT id FROM users WHERE email=?', email), 'An account already exists with this email', 409);
  const hash = hashPassword(data.password), department = text(data.department, 'Department', 100, true);
  return transaction(ctx.db, () => {
    const id = Number(run(ctx.db, 'INSERT INTO users(name,email,password_hash,role,department,created_at) VALUES(?,?,?,?,?,?)', name,email,hash,data.role,department,ctx.now()).lastInsertRowid);
    audit(ctx, actor, 'user.created', 'user', id, {role:data.role});
    return publicUser(one(ctx.db,'SELECT * FROM users WHERE id=?',id));
  });
}
export function login(ctx, email, password, ip = 'local') {
  email = text(email, 'Email').toLowerCase();
  const key = digest(ip + ':' + email), attempt = one(ctx.db,'SELECT * FROM login_attempts WHERE key=?',key);
  assert(!attempt || attempt.reset_at <= ctx.now() || attempt.attempts < 10, 'Too many login attempts. Try again in 15 minutes.', 429);
  const user = one(ctx.db, 'SELECT * FROM users WHERE email=?', email);
  const ok = verifyPassword(password, user?.password_hash ?? ctx.dummyHash);
  if (!user?.active || !ok) {
    const count = attempt && attempt.reset_at > ctx.now() ? attempt.attempts + 1 : 1;
    run(ctx.db,'INSERT OR REPLACE INTO login_attempts VALUES(?,?,?)',key,count,new Date(Date.parse(ctx.now())+15*60000).toISOString());
    assert(false, 'Invalid email or password', 401);
  }
  run(ctx.db,'DELETE FROM login_attempts WHERE key=?',key);
  const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex');
  const expires = new Date(Date.parse(ctx.now()) + ctx.sessionHours * 3600000).toISOString();
  run(ctx.db,'INSERT INTO sessions VALUES(?,?,?,?)',digest(token),user.id,csrf,expires);
  audit(ctx,user,'session.login','user',user.id);
  return {token,csrf,user:publicUser(user)};
}
export function authenticate(ctx, token) {
  assert(token, 'Please sign in', 401);
  const session = one(ctx.db,'SELECT s.*, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>? AND u.active=1',digest(token),ctx.now());
  assert(session, 'Session expired. Please sign in again.',401);
  return {user:publicUser(session),csrf:session.csrf};
}
export function updateUser(ctx, actor, id, data) {
  requireRole(actor,'admin');
  const user = one(ctx.db,'SELECT * FROM users WHERE id=?',id); assert(user,'User not found',404);
  const role = data.role ?? user.role; assert(['admin','security','student','faculty'].includes(role),'Invalid role');
  assert(data.active === undefined || typeof data.active === 'boolean','Active must be true or false');
  const active = data.active === undefined ? user.active : Number(data.active);
  assert(!(actor.id===id && (!active || role!=='admin')),'You cannot disable or demote your own administrator account');
  if(user.role==='admin' && (role!=='admin'||!active)) assert(one(ctx.db,"SELECT count(*) AS n FROM users WHERE role='admin' AND active=1").n>1,'Keep at least one active administrator');
  const hash = data.password ? hashPassword(data.password) : user.password_hash;
  transaction(ctx.db,()=>{
    run(ctx.db,'UPDATE users SET name=?,role=?,active=?,department=?,password_hash=? WHERE id=?',text(data.name??user.name,'Name',100),role,active,text(data.department??user.department,'Department',100,true),hash,id);
    run(ctx.db,'DELETE FROM sessions WHERE user_id=?',id);
    audit(ctx,actor,'user.updated','user',id,{role,active:!!active});
  });
  return publicUser(one(ctx.db,'SELECT * FROM users WHERE id=?',id));
}
export const listUsers = ctx => all(ctx.db,'SELECT id,name,email,role,department,active,created_at FROM users ORDER BY name');
