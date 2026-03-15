const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const file = process.argv[2];
const out = process.argv[3];
const buf = fs.readFileSync(file);
const parser = new PDFParse();
parser.parse(buf).then(d => {
  const text = 'PAGES: ' + d.numpages + '\n' + d.text;
  fs.writeFileSync(out, text);
  console.log('Written', text.length, 'chars to', out);
}).catch(e => { console.error(e.message); process.exit(1); });
