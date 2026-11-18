import { createApp } from '../server/app.js';
import { openDatabase } from '../server/shared/database.js';
import { createUser } from '../server/shared/auth.js';
import { createDemoApp } from '../server/demo.js';
export default async function setup(){
  const {app,ctx}=createApp({db:openDatabase(':memory:')});
  for(const role of ['student','faculty','admin','security'])createUser(ctx,null,{name:role+' Browser',email:role+'@lobby.test',password:'BrowserTest@2026',role,department:'Computer Science'});
  const server=await new Promise((resolve,reject)=>{const server=app.listen(3100,'127.0.0.1',()=>resolve(server));server.on('error',reject);});
  const demo=createDemoApp({secret:'browser-test-secret-at-least-32-characters',secureCookies:false});
  const demoServer=await new Promise((resolve,reject)=>{const instance=demo.app.listen(3101,'127.0.0.1',()=>resolve(instance));instance.on('error',reject);});
  return async()=>{for(const instance of [server,demoServer]){instance.closeAllConnections();await new Promise(resolve=>instance.close(resolve));}ctx.db.close();demo.ctx.db.close();};
}
