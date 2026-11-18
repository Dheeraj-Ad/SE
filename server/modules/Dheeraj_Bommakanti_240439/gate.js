import { one, run, transaction, audit } from '../../shared/database.js';
import { assert, requestFields, requireRole, instant } from '../../shared/validation.js';
import { insertRequest } from '../Sri_Charan_240660/requests.js';

export function registerDirect(ctx,user,data) {
  requireRole(user,'security');
  const fields=requestFields(data,ctx);
  return transaction(ctx.db,()=>insertRequest(ctx,user,fields,{source:'direct',status:'Approved'}));
}
export function enterRequest(ctx,user,id,verified) {
  requireRole(user,'security');
  assert(verified===true,'Confirm that you checked the visitor identity at the gate');
  return transaction(ctx.db,()=>{
    const request=one(ctx.db,'SELECT * FROM requests WHERE id=?',id); assert(request,'Visitor not found',404);
    assert(request.status==='Approved','Entry denied: visitor is not approved',409);
    assert(!one(ctx.db,'SELECT id FROM visits WHERE request_id=?',id),'Entry already recorded for this request',409);
    assert(ctx.now()>=request.starts_at && ctx.now()<request.ends_at,'Entry denied: outside the permitted visiting window');
    assert(!one(ctx.db,'SELECT id FROM visits WHERE visitor_id=? AND exit_at IS NULL',request.visitor_id),'Visitor is already inside campus',409);
    const visitId=Number(run(ctx.db,'INSERT INTO visits(request_id,visitor_id,entry_at,permitted_end,entered_by) VALUES(?,?,?,?,?)',id,request.visitor_id,ctx.now(),request.ends_at,user.id).lastInsertRowid);
    audit(ctx,user,'visit.entry','visit',visitId);
    return {...one(ctx.db,'SELECT * FROM visits WHERE id=?',visitId),status:'Inside Campus'};
  });
}
export function exitVisit(ctx,user,id) {
  requireRole(user,'security');
  return transaction(ctx.db,()=>{
    const visit=one(ctx.db,'SELECT * FROM visits WHERE id=?',id); assert(visit,'Visitor has no entry record',404);
    assert(!visit.exit_at,'Exit already recorded',409);
    const late=Number(ctx.now()>visit.permitted_end);
    run(ctx.db,'UPDATE visits SET exit_at=?,exited_by=?,overstay=MAX(overstay,?) WHERE id=?',ctx.now(),user.id,late,id);
    run(ctx.db,"UPDATE outbox SET status='cancelled' WHERE visit_id=? AND status='pending'",id);
    audit(ctx,user,'visit.exit','visit',id,{overstay:!!late});
    return {...one(ctx.db,'SELECT * FROM visits WHERE id=?',id),status:'Exited'};
  });
}
export function extendVisit(ctx,user,id,data) {
  requireRole(user,'security');
  const ends_at=instant(data.ends_at,'New end time');
  return transaction(ctx.db,()=>{
    const visit=one(ctx.db,'SELECT * FROM visits WHERE id=?',id); assert(visit,'Visitor not found',404);
    assert(!visit.exit_at,'Cannot extend an exited visit',409);
    assert(ends_at>visit.permitted_end,'New end time must be after the current permitted end');
    assert(ends_at>ctx.now(),'New end time must be in the future');
    const request=one(ctx.db,'SELECT * FROM requests WHERE id=?',visit.request_id);
    if(request.code_id) { const code=one(ctx.db,'SELECT * FROM codes WHERE id=?',request.code_id); assert(ends_at<=code.valid_to,'Cannot extend beyond code validity'); }
    run(ctx.db,'UPDATE visits SET permitted_end=? WHERE id=?',ends_at,id);
    audit(ctx,user,'visit.extended','visit',id,{previous_end:visit.permitted_end,new_end:ends_at});
    return {...one(ctx.db,'SELECT * FROM visits WHERE id=?',id),status:'Inside Campus'};
  });
}
