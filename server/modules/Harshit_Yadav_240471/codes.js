import { randomBytes } from 'node:crypto';
import { all, one, run, transaction, audit } from '../../shared/database.js';
import { assert, visitorFields, windowFields, text, requireRole, requireOwner, instant } from '../../shared/validation.js';
import { insertRequest } from '../Sri_Charan_240660/requests.js';

export function createCode(ctx,user,data) {
  requireRole(user,'admin','student','faculty');
  const visitor=visitorFields(data), window=windowFields(data,ctx);
  const host=text(data.host,'Host / faculty name',150), purpose=text(data.purpose,'Purpose',500);
  return transaction(ctx.db,()=>{
    const visitorId=Number(run(ctx.db,'INSERT INTO visitors(name,phone,email,affiliation,relation,id_proof) VALUES(?,?,?,?,?,?)',visitor.name,visitor.phone,visitor.email,visitor.affiliation,visitor.relation,visitor.id_proof).lastInsertRowid);
    const code=randomBytes(8).toString('hex').toUpperCase();
    const id=Number(run(ctx.db,'INSERT INTO codes(code,visitor_id,creator_id,host,purpose,valid_from,valid_to,created_at) VALUES(?,?,?,?,?,?,?,?)',code,visitorId,user.id,host,purpose,window.starts_at,window.ends_at,ctx.now()).lastInsertRowid);
    audit(ctx,user,'code.created','code',id);
    return one(ctx.db,'SELECT * FROM codes WHERE id=?',id);
  });
}
export function listCodes(ctx,user) {
  requireRole(user,'admin','student','faculty');
  return all(ctx.db,`SELECT c.*,v.name,v.phone,v.email FROM codes c JOIN visitors v ON v.id=c.visitor_id ${user.role==='admin'?'':'WHERE c.creator_id=?'} ORDER BY c.id DESC`,...(user.role==='admin'?[]:[user.id]));
}
function validCode(ctx,value) {
  const code=text(value,'Temporary code',64).toUpperCase();
  const row=one(ctx.db,'SELECT c.*,v.name,v.phone,v.email,v.affiliation,v.relation,v.id_proof FROM codes c JOIN visitors v ON v.id=c.visitor_id WHERE c.code=?',code);
  assert(row,'Invalid code',404); assert(!row.revoked,'Code revoked: entry denied',409);
  assert(ctx.now()<row.valid_to,'Code expired: entry denied',409);
  assert(ctx.now()>=row.valid_from,'Code is not active yet',409);
  return row;
}
export function verifyCode(ctx,user,value) { requireRole(user,'security'); return validCode(ctx,value); }
export function revokeCode(ctx,user,id) {
  const code=one(ctx.db,'SELECT * FROM codes WHERE id=?',id); assert(code,'Code not found',404); requireOwner(user,code.creator_id);
  transaction(ctx.db,()=>{run(ctx.db,'UPDATE codes SET revoked=1 WHERE id=?',id); audit(ctx,user,'code.revoked','code',id);});
  return {message:'Code revoked'};
}
export function enterCode(ctx,user,data) {
  requireRole(user,'security'); assert(data.verified===true,'Confirm that you checked the visitor identity at the gate');
  return transaction(ctx.db,()=>{
    const code=validCode(ctx,data.code);
    const ends_at=instant(data.ends_at,'Permitted end time');
    assert(ends_at>ctx.now() && ends_at<=code.valid_to,'Permitted end must be in the future and within code validity');
    assert(!one(ctx.db,'SELECT id FROM visits WHERE visitor_id=? AND exit_at IS NULL',code.visitor_id),'Visitor is already inside campus',409);
    const creator=one(ctx.db,'SELECT id FROM users WHERE id=?',code.creator_id);
    const request=insertRequest(ctx,creator,{...code,starts_at:ctx.now(),ends_at},{source:'code',status:'Approved',codeId:code.id,visitorId:code.visitor_id});
    const id=Number(run(ctx.db,'INSERT INTO visits(request_id,visitor_id,entry_at,permitted_end,entered_by) VALUES(?,?,?,?,?)',request.id,code.visitor_id,ctx.now(),ends_at,user.id).lastInsertRowid);
    audit(ctx,user,'code.entry','visit',id,{code_id:code.id});
    return {...one(ctx.db,'SELECT * FROM visits WHERE id=?',id),status:'Inside Campus'};
  });
}
