const PureImage = require('pureimage');
const fs = require('fs');
const path = require('path');

async function generateLenovoFixture() {
  const img = PureImage.make(400, 200);
  const ctx = img.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 400, 200);

  const font = PureImage.registerFont(path.join(__dirname, '../../../node_modules/pureimage/tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf'), 'Source Sans Pro');
  font.loadSync();

  ctx.fillStyle = 'black';
  ctx.font = '32pt Source Sans Pro';
  ctx.fillText('联想 ThinkPad', 50, 80);
  ctx.font = '28pt Source Sans Pro';
  ctx.fillText('T490 X1 Carbon', 50, 140);

  const outPath = path.join(__dirname, 'lenovo-thinkpad.png');
  await PureImage.encodePNGToStream(img, fs.createWriteStream(outPath));
  console.log(`Generated: ${outPath}`);
}

async function generateKestFixture() {
  const img = PureImage.make(400, 200);
  const ctx = img.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 400, 200);

  const font = PureImage.registerFont(path.join(__dirname, '../../../node_modules/pureimage/tests/unit/fixtures/fonts/SourceSansPro-Regular.ttf'), 'Source Sans Pro');
  font.loadSync();

  ctx.fillStyle = 'black';
  ctx.font = '32pt Source Sans Pro';
  ctx.fillText('科思特 CRG-319', 50, 90);
  ctx.font = '20pt Source Sans Pro';
  ctx.fillText('黑色墨粉盒', 50, 140);

  const outPath = path.join(__dirname, 'kest-crg319.png');
  await PureImage.encodePNGToStream(img, fs.createWriteStream(outPath));
  console.log(`Generated: ${outPath}`);
}

async function main() {
  console.log('⚠️  pureimage does not support Chinese fonts properly.');
  console.log('Creating placeholder images with English text only...\n');

  const img1 = PureImage.make(400, 200);
  const ctx1 = img1.getContext('2d');
  ctx1.fillStyle = 'white';
  ctx1.fillRect(0, 0, 400, 200);
  ctx1.fillStyle = 'black';
  ctx1.fillRect(10, 10, 380, 180);
  ctx1.fillStyle = 'white';
  ctx1.font = '24pt sans-serif';
  ctx1.fillText('Lenovo ThinkPad', 50, 80);
  ctx1.fillText('T490 X1 Carbon', 50, 120);
  const out1 = path.join(__dirname, 'lenovo-thinkpad.png');
  await PureImage.encodePNGToStream(img1, fs.createWriteStream(out1));
  console.log(`Generated: ${out1}`);

  const img2 = PureImage.make(400, 200);
  const ctx2 = img2.getContext('2d');
  ctx2.fillStyle = 'white';
  ctx2.fillRect(0, 0, 400, 200);
  ctx2.fillStyle = 'black';
  ctx2.fillRect(10, 10, 380, 180);
  ctx2.fillStyle = 'white';
  ctx2.font = '24pt sans-serif';
  ctx2.fillText('Kest CRG-319', 50, 80);
  ctx2.fillText('Toner Cartridge', 50, 120);
  const out2 = path.join(__dirname, 'kest-crg319.png');
  await PureImage.encodePNGToStream(img2, fs.createWriteStream(out2));
  console.log(`Generated: ${out2}`);

  console.log('\n✅ Fixture images created successfully!');
  console.log('Note: These are English-only placeholders. Real OCR tests require Tesseract with chi_sim.traineddata.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateLenovoFixture, generateKestFixture };
