const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const parser = new PDFParse();
parser.parse(buf).then(d => {
  process.stdout.write('PAGES: ' + d.numpages + '\n');
  process.stdout.write(d.text);
}).catch(e => { console.error(e); process.exit(1); });
