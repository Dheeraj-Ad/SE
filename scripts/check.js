import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
let count=0;
function check(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=join(dir,item.name);if(item.isDirectory())check(file);else if(/\.(js|mjs)$/.test(file)){execFileSync(process.execPath,['--check',file],{stdio:'inherit'});count++;}}}
for(const dir of ['server','public','scripts','tests'])check(dir);
console.log(`Syntax checks passed for ${count} JavaScript files.`);
