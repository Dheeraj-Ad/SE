import { createApp } from '../server/app.js';
import { openDatabase } from '../server/shared/database.js';
import { createUser } from '../server/shared/auth.js';
export default async function setup(){
  const {app,ctx}=createApp({db:openDatabase(':memory:')});
  for(const role of ['student','faculty','admin','security'])createUser(ctx,null,{name:role+' Browser',email:role+'@lobby.test',password:'BrowserTest@2026',role,department:'Computer Science'});
  const server=await new Promise((resolve,reject)=>{const server=app.listen(3100,'127.0.0.1',()=>resolve(server));server.on('error',reject);});
  return async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));ctx.db.close();};
}
