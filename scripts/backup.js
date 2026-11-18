import { backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { openDatabase } from '../server/shared/database.js';
mkdirSync('backups',{recursive:true});
const file=`backups/lobby-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`;
const db=openDatabase(process.env.DATABASE_PATH);
await backup(db,file);db.close();console.log(`Consistent database backup written to ${file}`);
