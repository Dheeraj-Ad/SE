import { existsSync, copyFileSync } from 'node:fs';
import { createApp } from '../server/app.js';
import { createUser } from '../server/shared/auth.js';
import { one } from '../server/shared/database.js';
import { createRequest, decide } from '../server/modules/Sri_Charan_240660/requests.js';
import { enterRequest } from '../server/modules/Dheeraj_Bommakanti_240439/gate.js';

if(!existsSync('.env'))copyFileSync('.env.example','.env');
const {ctx}=createApp();
if(one(ctx.db,'SELECT id FROM users LIMIT 1')) console.log('Setup already completed. Existing records and accounts were preserved.');
else {
  const password='Lobby@2026!';
  const users={};
  for(const [role,name,department] of [['admin','Campus Administrator','Administration'],['security','Gate Officer','Main gate'],['faculty','Dr. Ananya Rao','Computer Science'],['student','Arjun Mehta','Computer Science']]) users[role]=createUser(ctx,null,{name,email:`${role}@lobby.local`,password,role,department});
  const start=new Date();start.setHours(0,0,0,0);
  const end=new Date(Date.now()+4*3600000);
  const examples=[['Meera Shah','9876500101','Research collaboration','faculty'],['Rohan Kumar','9876500102','Campus tour','student'],['Priya Nair','9876500103','Department meeting','faculty'],['Vikram Singh','9876500104','Family visit','student']];
  for(let i=0;i<examples.length;i++){
    const [name,phone,purpose,role]=examples[i];
    const request=createRequest(ctx,users[role],{name,phone,email:'',host:users[role].name,purpose,starts_at:start.toISOString(),ends_at:end.toISOString(),affiliation:'Sample visitor'});
    if(i<2)decide(ctx,users.admin,request.id,{decision:'Approved'});
    if(i===0)enterRequest(ctx,users.security,request.id,true);
  }
  console.log('Local demonstration accounts created (synthetic visitor records):');
  console.log('admin@lobby.local | security@lobby.local | faculty@lobby.local | student@lobby.local');
  console.log('Initial password for all four accounts: Lobby@2026!');
  console.log('Change these passwords from Account before using real campus data.');
}
ctx.db.close();
