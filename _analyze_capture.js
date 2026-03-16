const fs = require('fs');
const path = 'C:/Users/user/Downloads/micron-capture.syx';
if (!fs.existsSync(path)) {
  console.log('File not found at', path);
  const dl = fs.readdirSync('C:/Users/user/Downloads').filter(f => f.includes('capture') || f.includes('micron'));
  console.log('Downloads containing micron/capture:', dl);
  process.exit(0);
}
const data = new Uint8Array(fs.readFileSync(path));
console.log('File size:', data.length, 'bytes');

let idx = 0, msgNum = 0;
const contentCounts = {};
while (idx < data.length) {
  if (data[idx] !== 0xF0) { idx++; continue; }
  let end = data.indexOf(0xF7, idx);
  if (end < 0) { console.log('No F7 found after idx', idx); break; }
  const msg = data.slice(idx, end + 1);
  const hex = Array.from(msg.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  const isAlesis = msg[1] === 0 && msg[2] === 0 && msg[3] === 0x0E && msg[4] === 0x22;
  const content = isAlesis ? msg[5] : -1;
  contentCounts[content] = (contentCounts[content] || 0) + 1;
  if (msgNum < 20 || content !== 1) {
    console.log(`Msg #${msgNum}: len=${msg.length} alesis=${isAlesis} content=${content} bank=${msg[6]} slot=${msg[8]} hex=${hex}`);
  }
  msgNum++;
  idx = end + 1;
}

console.log('\nTotal messages:', msgNum);
console.log('Content type distribution:', JSON.stringify(contentCounts));
