import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {fixture,inside,valid,upload,groupCsv} from '../helpers.js';
import {createMailer,checkTime,dispatchMail} from '../../server/modules/Sri_Charan_240660/notifications.js';
import {one} from '../../server/shared/database.js';
import {importGroup,approveGroup} from '../../server/modules/Harshit_Yadav_240471/imports.js';
import {records} from '../../server/modules/Sri_Surya_240495/records.js';
import {createRequest} from '../../server/modules/Sri_Charan_240660/requests.js';

test('SMTP adapter delivers reminder to a real local SMTP socket',async t=>{
  const f=fixture(t),messages=[],sockets=new Set();
  const server=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.write('220 localhost ESMTP\r\n');
    let buffer='',dataMode=false,message='';
    socket.on('data',chunk=>{
      buffer+=chunk.toString();
      while(buffer.includes('\r\n')){
        const pos=buffer.indexOf('\r\n'),line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
        if(dataMode){if(line==='.'){dataMode=false;messages.push(message);socket.write('250 Queued\r\n');}else message+=line+'\r\n';}
        else if(/^EHLO|^HELO/.test(line))socket.write('250 localhost\r\n');
        else if(line==='DATA'){dataMode=true;message='';socket.write('354 Send data\r\n');}
        else if(line==='QUIT'){socket.end('221 Bye\r\n');}
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));});
  f.ctx.mailer=createMailer({MAIL_MODE:'smtp',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(server.address().port),SMTP_SECURE:'false',MAIL_FROM:'lobby@example.com'});
  inside(f);f.setTime('2026-10-27T06:20:00Z');checkTime(f.ctx);await dispatchMail(f.ctx);
  assert.equal(messages.length,1);assert.match(messages[0],/To: asha@example.com/);assert.match(messages[0],/Subject: Visiting time ends soon/);assert.equal(one(f.ctx.db,'SELECT status FROM outbox').status,'sent');
});
test('Moderate campus group: 300 visitors import, approve and search within 10 seconds',async t=>{
  const f=fixture(t),header=groupCsv().split('\n')[0];
  const lines=Array.from({length:300},(_,i)=>{const d=valid({name:`Campus Visitor ${i}`,phone:String(9000000000+i)});return ['name','phone','email','affiliation','host','purpose','starts_at','ends_at'].map(k=>d[k]).join(',');});
  const start=performance.now();const group=await importGroup(f.ctx,f.users.admin,upload([header,...lines].join('\n')),'300 person tour');approveGroup(f.ctx,f.users.admin,group.id);const result=records(f.ctx,f.users.security,{q:'Campus Visitor 299'});
  const elapsed=performance.now()-start;
  assert.equal(result.total,1);assert.equal(one(f.ctx.db,'SELECT count(*) AS n FROM requests').n,300);assert.ok(elapsed<10000,`Processing took ${elapsed}ms`);t.diagnostic(`300-row import, approval, and search: ${Math.round(elapsed)} ms`);
});
test('Calendar validation rejects normalized impossible dates',t=>{const f=fixture(t);assert.throws(()=>createRequest(f.ctx,f.users.student,valid({starts_at:'2027-02-30T10:00:00Z',ends_at:'2027-03-03T10:00:00Z'})),/valid calendar/);});
test('Design sequence relationship and identity reference persist in record',t=>{const f=fixture(t);createRequest(f.ctx,f.users.student,valid({relation:'Parent',id_proof:'College ID 1234'}));const row=records(f.ctx,f.users.student).rows[0];assert.equal(row.relation,'Parent');assert.equal(row.id_proof,'College ID 1234');});
test('XLSX expansion limits reject excessive declared uncompressed content',async t=>{const f=fixture(t);const buffer=Buffer.alloc(68);buffer.writeUInt32LE(0x02014b50,0);buffer.writeUInt32LE(21*1024*1024,24);buffer.writeUInt32LE(0x06054b50,46);buffer.writeUInt16LE(1,56);buffer.writeUInt32LE(0,62);await assert.rejects(importGroup(f.ctx,f.users.admin,{originalname:'large.xlsx',buffer},'Large'),/exceeds 20 MB/);});
