import { readFileSync } from 'node:fs';
import { createDemoApp } from '../server/demo.js';

let instance;
export default function handler(req, res) {
  try {
    if (!instance) {
      const { secret } = JSON.parse(readFileSync(new URL('../server/demo-session-key.json', import.meta.url), 'utf8'));
      instance = createDemoApp({ secret });
    }
    return instance.app(req, res);
  } catch (error) {
    console.error('Demo initialization failed:', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'The demo service could not start. Please redeploy the application.' }));
  }
}
