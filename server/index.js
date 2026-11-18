import { createApp } from './app.js';
import { checkTime, dispatchMail } from './modules/Sri_Charan_240660/notifications.js';
import { run, one } from './shared/database.js';

const {app,ctx}=createApp();
if(!one(ctx.db,'SELECT id FROM users LIMIT 1')) console.warn('No users configured. Run npm run setup before signing in.');
run(ctx.db,"UPDATE outbox SET status='pending' WHERE status='sending'");
const tick=async()=>{try{checkTime(ctx);await dispatchMail(ctx);}catch(error){console.error('Notification worker:',error.message);}};
const server=app.listen(Number(process.env.PORT??3000),process.env.HOST??'127.0.0.1',()=>{
  console.log(`LOBBY is running at http://${process.env.HOST??'127.0.0.1'}:${process.env.PORT??3000}`);
  tick();
});
const timer=setInterval(tick,30000);timer.unref();
async function stop(){clearInterval(timer);server.close(async()=>{while(ctx.dispatching)await new Promise(resolve=>setTimeout(resolve,100));ctx.db.close();process.exit(0);});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
