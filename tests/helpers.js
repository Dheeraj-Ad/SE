import { createApp } from '../server/app.js';
import { openDatabase } from '../server/shared/database.js';
import { createUser } from '../server/shared/auth.js';
import { createRequest, decide } from '../server/modules/Sri_Charan_240660/requests.js';
import { enterRequest } from '../server/modules/Dheeraj_Bommakanti_240439/gate.js';

export function fixture(t, options={}) {
  let clock='2026-10-27T04:30:00.000Z';
  const delivered=[];
  const db=openDatabase(options.file??':memory:');
  const {app,ctx}=createApp({db,now:()=>clock,mailer:{mode:'smtp',send:async item=>delivered.push(item)}});
  const users={};
  for(const role of ['student','faculty','admin','security'])users[role]=createUser(ctx,null,{name:role+' Test',email:`${role}@test.local`,role,password:'TestPass@2026',department:'Computer Science'});
  t.after(()=>db.close());
  return {app,ctx,users,delivered,setTime:value=>{clock=new Date(value).toISOString();}};
}
export const valid=(extra={})=>({name:'Asha Visitor',phone:'9876543210',email:'asha@example.com',affiliation:'Visiting college',host:'Faculty Test',purpose:'Research meeting',starts_at:'2026-10-27T04:00:00.000Z',ends_at:'2026-10-27T06:30:00.000Z',...extra});
export function approved(f,extra={}){const r=createRequest(f.ctx,f.users.student,valid(extra));decide(f.ctx,f.users.admin,r.id,{decision:'Approved'});return r;}
export function inside(f,extra={}){const r=approved(f,extra);return enterRequest(f.ctx,f.users.security,r.id,true);}
export const upload=(text,name='group.csv')=>({originalname:name,buffer:Buffer.from(text)});
export const groupCsv=(extra={})=>{const data=valid(extra);const keys=['name','phone','email','affiliation','host','purpose','starts_at','ends_at'];return keys.join(',')+'\n'+keys.map(k=>data[k]).join(',')+'\n';};
