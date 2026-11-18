export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function assert(condition, message, status = 400) { if (!condition) throw new AppError(message, status); }
export function text(value, label, max = 200, optional = false) {
  assert(typeof value === 'string' || (optional && value == null), `${label} is required`);
  const result = (value ?? '').trim();
  assert(optional || result.length, `${label} is required`);
  assert(result.length <= max, `${label} must be at most ${max} characters`);
  return result;
}
export function instant(value, label) {
  const parts=typeof value==='string'&&value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  assert(parts && Number.isFinite(Date.parse(value)), `${label} must be a valid date and time with timezone`);
  const [year,month,day,hour,minute,second]=parts.slice(1,7).map(Number);
  const calendar=new Date(Date.UTC(year,month-1,day));
  assert(calendar.getUTCFullYear()===year&&calendar.getUTCMonth()===month-1&&calendar.getUTCDate()===day&&hour<24&&minute<60&&(!second||second<60),`${label} must be a valid calendar date and time`);
  return new Date(value).toISOString();
}
export const campusDate = (value, timezone = 'Asia/Kolkata') => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(value));
export function windowFields(data, ctx, allowPast = false) {
  const starts_at = instant(data.starts_at, 'Start time');
  const ends_at = instant(data.ends_at, 'End time');
  assert(ends_at > starts_at, 'End time must be after start time');
  if (!allowPast) {
    assert(campusDate(starts_at, ctx.timezone) >= campusDate(ctx.now(), ctx.timezone), 'Permitted date cannot be in the past');
    assert(ends_at > ctx.now(), 'End time must be in the future');
  }
  return { starts_at, ends_at };
}
export function visitorFields(data) {
  const name = text(data.name, 'Visitor name', 100);
  const phone = text(data.phone, 'Phone number', 20).replace(/[\s()-]/g, '');
  assert(/^\+?[0-9]{10,15}$/.test(phone), 'Invalid phone number: use 10 to 15 digits');
  const email = text(data.email, 'Email', 200, true);
  assert(!email || /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(email), 'Invalid email address');
  return { name, phone, email, affiliation: text(data.affiliation, 'Affiliation', 150, true), relation:text(data.relation,'Relationship',100,true), id_proof:text(data.id_proof,'ID proof reference',100,true) };
}
export function requestFields(data, ctx, allowPast = false) {
  return { ...visitorFields(data), host: text(data.host, 'Host / department', 150), purpose: text(data.purpose, 'Purpose', 500), ...windowFields(data, ctx, allowPast) };
}
export function requireRole(user, ...roles) { assert(user && roles.includes(user.role), 'You do not have permission for this action', 403); }
export function requireOwner(user, ownerId) { assert(user.role === 'admin' || user.id === ownerId, 'You do not have permission to view this record', 403); }
