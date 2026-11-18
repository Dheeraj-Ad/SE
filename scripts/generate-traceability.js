import {readFileSync,writeFileSync} from 'node:fs';
const contributors=[
 ['Dheeraj_Bommakanti_240439','Visitor_Management_Test_Cases.docx'],
 ['Harshit_Yadav_240471','TestCases_Harshit Yadav_240471.docx'],
 ['Sri_Charan_240660','TestCases_Sri_Charan_240660.pdf'],
 ['Sri_Surya_240495','TestCases_Sri_Surya_240495.pdf']
];
let result='# Supplied acceptance test map\n\nGenerated from the executable acceptance-test titles. All 50 cases passed in the recorded verification; see [TEST_REPORT.md](TEST_REPORT.md).\n';
let count=0;
for(const [folder,source] of contributors){
 result+=`\n## ${folder}\n\nSource: [${source}](sources/${encodeURIComponent(source)}). Executable file: [acceptance.test.js](../tests/${folder}/acceptance.test.js).\n\n| Test ID | Verified behavior |\n|---|---|\n`;
 const code=readFileSync(`tests/${folder}/acceptance.test.js`,'utf8');
 for(const match of code.matchAll(/^test\('([^']+)'/gm)){const space=match[1].indexOf(' ');result+=`| ${match[1].slice(0,space)} | ${match[1].slice(space+1)} |\n`;count++;}
}
if(count!==50)throw new Error(`Expected 50 acceptance cases, found ${count}`);
writeFileSync('docs/ACCEPTANCE_CASES.md',result);
console.log(`Mapped ${count} supplied acceptance cases.`);
