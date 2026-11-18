import { all, one } from '../../shared/database.js';
import { assert, instant, requireRole } from '../../shared/validation.js';

const base=`SELECT r.*,v.name,v.phone,v.email,v.affiliation,v.relation,v.id_proof,u.name AS requester_name,
  t.id AS visit_id,t.entry_at,t.exit_at,t.permitted_end,t.overstay,
  CASE WHEN t.exit_at IS NOT NULL THEN 'Exited' WHEN t.id IS NOT NULL AND t.permitted_end<=? THEN 'Time Expired'
  WHEN t.id IS NOT NULL THEN 'Inside Campus' ELSE r.status END AS visit_status
  FROM requests r JOIN visitors v ON v.id=r.visitor_id JOIN users u ON u.id=r.requester_id LEFT JOIN visits t ON t.request_id=r.id`;
function filters(user,query) {
  const clauses=[],args=[];
  if(['student','faculty'].includes(user.role)) {clauses.push('requester_id=?');args.push(user.id);}
  if(user.role==='security') clauses.push("status IN ('Approved','Lapsed')");
  if(query.q) {assert(String(query.q).length<=200,'Search is too long');clauses.push('(instr(lower(name),lower(?))>0 OR instr(phone,?)>0 OR instr(lower(host),lower(?))>0)');args.push(query.q,query.q,query.q);}
  if(query.status) {assert(['Pending','Approved','Rejected','Lapsed','Inside Campus','Time Expired','Exited'].includes(query.status),'Invalid status');clauses.push('visit_status=?');args.push(query.status);}
  if(query.from) {clauses.push('starts_at>=?');args.push(instant(query.from,'From date'));}
  if(query.to) {clauses.push('starts_at<=?');args.push(instant(query.to,'To date'));}
  if(query.from&&query.to) assert(instant(query.from,'From date')<=instant(query.to,'To date'),'From date must be before To date');
  if(query.source) {assert(['request','direct','group','code'].includes(query.source),'Invalid source');clauses.push('source=?');args.push(query.source);}
  return {where:clauses.length?' WHERE '+clauses.join(' AND '):'',args};
}
export function records(ctx,user,query={}) {
  const {where,args}=filters(user,query);
  const page=Number(query.page??1),limit=Number(query.limit??50);
  assert(Number.isInteger(page)&&page>=1&&Number.isInteger(limit)&&limit>=1&&limit<=1000,'Invalid pagination');
  const sql=`WITH records AS (${base}) SELECT * FROM records${where}`;
  const rows=all(ctx.db,sql+' ORDER BY id DESC LIMIT ? OFFSET ?',ctx.now(),...args,limit,(page-1)*limit);
  const total=one(ctx.db,`WITH records AS (${base}) SELECT count(*) AS n FROM records${where}`,ctx.now(),...args).n;
  return {rows,total,page,limit};
}
export function detail(ctx,user,id) {
  const row=one(ctx.db,base+' WHERE r.id=?',ctx.now(),id); assert(row,'Record not found',404);
  assert(!['student','faculty'].includes(user.role)||row.requester_id===user.id,'You do not have permission to view this record',403);
  assert(user.role!=='security'||['Approved','Lapsed'].includes(row.status),'Record not available to Security',403);
  return row;
}
export function report(ctx,user,query={}) {
  requireRole(user,'admin');
  const {where,args}=filters(user,query);
  const summary=one(ctx.db,`WITH records AS (${base}) SELECT count(*) AS visitors,
  coalesce(sum(entry_at IS NOT NULL),0) AS entries,coalesce(sum(exit_at IS NOT NULL),0) AS exits,
  coalesce(sum(status IN ('Approved','Lapsed')),0) AS approvals,coalesce(sum(status='Pending'),0) AS pending,
  coalesce(sum(status='Rejected'),0) AS rejected,coalesce(sum(visit_status IN ('Inside Campus','Time Expired')),0) AS inside,
  coalesce(sum(visit_status='Time Expired'),0) AS overdue FROM records${where}`,ctx.now(),...args);
  const bySource=all(ctx.db,`WITH records AS (${base}) SELECT source,count(*) AS count FROM records${where} GROUP BY source`,ctx.now(),...args);
  return {summary,bySource};
}
export function dashboard(ctx,user) {
  const {where,args}=filters(user,{});
  return one(ctx.db,`WITH records AS (${base}) SELECT count(*) AS total,
    coalesce(sum(visit_status='Pending'),0) AS pending,coalesce(sum(visit_status='Approved'),0) AS expected,
    coalesce(sum(visit_status IN ('Inside Campus','Time Expired')),0) AS inside,
    coalesce(sum(visit_status='Time Expired'),0) AS overdue,coalesce(sum(visit_status='Exited'),0) AS exited
    FROM records${where}`,ctx.now(),...args);
}
export function csv(rows) {
  const keys=['id','name','phone','email','host','purpose','source','starts_at','ends_at','visit_status','entry_at','exit_at','permitted_end','overstay'];
  const escape=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return '\uFEFF'+[keys.map(escape).join(','),...rows.map(row=>keys.map(k=>escape(row[k])).join(','))].join('\r\n');
}
