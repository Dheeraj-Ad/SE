import nodemailer from 'nodemailer';
import { all, run, transaction } from '../../shared/database.js';
import { notify, roleIds } from './requests.js';

export function checkTime(ctx) {
  transaction(ctx.db,()=>{
    run(ctx.db,"UPDATE requests SET status='Lapsed' WHERE status='Approved' AND ends_at<=? AND NOT EXISTS(SELECT 1 FROM visits WHERE request_id=requests.id)",ctx.now());
    run(ctx.db,'DELETE FROM sessions WHERE expires_at<=?',ctx.now());
    const visits=all(ctx.db,`SELECT t.*,v.name,v.email,r.requester_id FROM visits t JOIN visitors v ON v.id=t.visitor_id JOIN requests r ON r.id=t.request_id WHERE t.exit_at IS NULL`);
    const staff=roleIds(ctx,'admin','security');
    for(const visit of visits) {
      const remaining=Date.parse(visit.permitted_end)-Date.parse(ctx.now());
      const events=[];
      if(remaining>0 && remaining<=15*60000) events.push(['reminder','Visiting time ends soon',`Hello ${visit.name}, your permitted visiting time ends at ${visit.permitted_end}. Please report to the gate or ask Security for an extension.`]);
      if(remaining<=0) {
        events.push(['expired','Visiting time expired',`Hello ${visit.name}, your permitted visiting time has expired. Please report to the security gate.`]);
        run(ctx.db,'UPDATE visits SET overstay=1 WHERE id=?',visit.id);
        notify(ctx,[...staff,visit.requester_id],`expired:${visit.id}`,'Visitor overdue',`${visit.name} has exceeded the permitted visiting time.`,visit.request_id);
      }
      if(remaining<=-3600000) {
        notify(ctx,roleIds(ctx,'admin'),`escalated:${visit.id}`,'Overstay escalation',`${visit.name} is more than one hour overdue.`,visit.request_id);
        for(const admin of all(ctx.db,"SELECT email FROM users WHERE role='admin' AND active=1")) queue(ctx,`escalated:${visit.id}:${admin.email}`,admin.email,'Overstay escalation',`${visit.name} remains inside campus over one hour after the permitted end time.`,visit.id);
      }
      for(const [kind,title,body] of events) if(visit.email) queue(ctx,`${kind}:${visit.id}`,visit.email,title,body,visit.id);
    }
  });
}
function queue(ctx,key,to,subject,body,visitId) {run(ctx.db,'INSERT OR IGNORE INTO outbox(event_key,recipient,subject,body,visit_id,created_at) VALUES(?,?,?,?,?,?)',key,to,subject,body,visitId,ctx.now());}

export function createMailer(config=process.env) {
  const mode=config.MAIL_MODE??'outbox';
  if(mode==='outbox') return {mode,send:async()=>({local:true})};
  if(mode!=='smtp') throw new Error('MAIL_MODE must be outbox or smtp');
  if(!config.SMTP_HOST||!config.MAIL_FROM) throw new Error('SMTP_HOST and MAIL_FROM are required for SMTP delivery');
  const transport=nodemailer.createTransport({host:config.SMTP_HOST,port:Number(config.SMTP_PORT??587),secure:config.SMTP_SECURE==='true',auth:config.SMTP_USER?{user:config.SMTP_USER,pass:config.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
  return {mode,send:message=>transport.sendMail({from:config.MAIL_FROM,to:message.recipient,subject:message.subject,text:message.body, messageId:`<lobby-${message.id}-${message.created_at.replace(/\W/g,'')}@campus.local>`})};
}
export async function dispatchMail(ctx) {
  if(ctx.dispatching) return;
  ctx.dispatching=true;
  try {
    for(const item of all(ctx.db,"SELECT * FROM outbox WHERE status='pending' AND attempts<5 ORDER BY id LIMIT 50")) {
      // Claim before awaiting the network. Recover interrupted claims at startup.
      if(!run(ctx.db,"UPDATE outbox SET status='sending',attempts=attempts+1 WHERE id=? AND status='pending'",item.id).changes) continue;
      try {
        await ctx.mailer.send(item);
        run(ctx.db,'UPDATE outbox SET status=?,sent_at=?,last_error=NULL WHERE id=?',ctx.mailer.mode==='outbox'?'local':'sent',ctx.now(),item.id);
      } catch(error) {
        run(ctx.db,'UPDATE outbox SET status=?,last_error=? WHERE id=?',item.attempts+1>=5?'failed':'pending',String(error.message).slice(0,200),item.id);
      }
    }
  } finally {ctx.dispatching=false;}
}
