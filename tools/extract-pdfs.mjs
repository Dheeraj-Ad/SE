import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const dir = path.resolve('docs/sources');
for (const file of await fs.readdir(dir)) {
  if (!file.endsWith('.pdf')) continue;
  const pdf = await getDocument({ data: new Uint8Array(await fs.readFile(path.join(dir, file))), useSystemFonts: true }).promise;
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++) {
    const page=await pdf.getPage(n); const content=await page.getTextContent();
    pages.push(`\n--- Page ${n} ---\n`+content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join(''));
  }
  await fs.writeFile(path.join('docs/extracted',file.replace('.pdf','.txt')),pages.join('\n'));
  console.log(file, pdf.numPages, 'pages');
}
