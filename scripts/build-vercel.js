import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../server/demo-session-key.json', import.meta.url), JSON.stringify({ secret: randomBytes(48).toString('hex') }));
console.log('Prepared Vercel demo with four fixed accounts and a deployment session key.');
