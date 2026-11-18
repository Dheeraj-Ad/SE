import { all, one, run, audit, transaction } from '../../shared/database.js';
import { assert, requestFields, requireRole, text } from '../../shared/validation.js';

export function notify(ctx, userIds, key, title, message, requestId = null) {
  for (const id of new Set(userIds)) run(ctx.db,'INSERT OR IGNORE INTO notifications(user_id,event_key,title,message,request_id,created_at) VALUES(?,?,?,?,?,?)',id,key,title,message,requestId,ctx.now());
}
export const roleIds = (ctx, ...roles) => all(ctx.db,`SELECT id FROM users WHERE active=1 AND role IN (${roles.map(()=>'?').join(',')})`,...roles).map(u=>u.id);
export function insertRequest(ctx, user, fields, {source='request',status='Pending',groupId=null,codeId=null,visitorId=null} = {}) {
  const v = visitorId ?? Number(run(ctx.db,'INSERT INTO visitors(name,phone,email,affiliation,relation,id_proof) VALUES(?,?,?,?,?,?)',fields.name,fields.phone,fields.email,fields.affiliation,fields.relation??'',fields.id_proof??'').lastInsertRowid);
  const id = Number(run(ctx.db,'INSERT INTO requests(visitor_id,requester_id,host,purpose,starts_at,ends_at,status,source,group_id,code_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',v,user.id,fields.host,fields.purpose,fields.starts_at,fields.ends_at,status,source,groupId,codeId,ctx.now()).lastInsertRowid);
  audit(ctx,user,'request.created','request',id,{source,status});
  return one(ctx.db,'SELECT * FROM requests WHERE id=?',id);
}
export function createRequest(ctx,user,data) {
  requireRole(user,'student','faculty');
  const fields=requestFields(data,ctx);
  return transaction(ctx.db,()=>{
    const request=insertRequest(ctx,user,fields);
    notify(ctx,roleIds(ctx,'admin'),`request:${request.id}`,'New visitor request',`${fields.name} is waiting for approval.`,request.id);
    return request;
  });
}
export function decide(ctx,user,id,data) {
  requireRole(user,'admin');
  assert(['Approved','Rejected'].includes(data.decision),'Decision must be Approved or Rejected');
  const remarks=text(data.remarks,'Remarks',500,true);
  return transaction(ctx.db,()=>{
    const request=one(ctx.db,'SELECT * FROM requests WHERE id=?',id); assert(request,'Request not found',404);
    assert(request.status==='Pending','Only pending requests can be decided',409);
    if(data.decision==='Approved') assert(request.ends_at>ctx.now(),'The visiting window has expired');
    run(ctx.db,'UPDATE requests SET status=?,remarks=?,decided_by=?,decided_at=? WHERE id=?',data.decision,remarks,user.id,ctx.now(),id);
    notify(ctx,[request.requester_id,...(data.decision==='Approved'?roleIds(ctx,'security'):[])],`decision:${id}`,`Request ${data.decision.toLowerCase()}`,`Visitor request #${id} was ${data.decision.toLowerCase()}.${remarks?' '+remarks:''}`,id);
    audit(ctx,user,'request.'+data.decision.toLowerCase(),'request',id,{remarks});
    return one(ctx.db,'SELECT * FROM requests WHERE id=?',id);
  });
}
