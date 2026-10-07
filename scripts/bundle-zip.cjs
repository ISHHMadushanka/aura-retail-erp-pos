const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function createZip() {
  const zip = new JSZip();
  const rootDir = path.resolve(__dirname, '..');
  const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.cache']);

  function addFolder(dirPath, zipFolder) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.has(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subZip = zipFolder.folder(entry.name);
        addFolder(fullPath, subZip);
      } else if (entry.isFile() && !entry.name.endsWith('.zip')) {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  }

  addFolder(rootDir, zip);

  console.log('Generating zip archive...');
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const outPath = path.join(rootDir, 'aura-retail-source-code.zip');
  fs.writeFileSync(outPath, content);
  console.log('Successfully written to:', outPath, `(${Math.round(content.length / 1024)} KB)`);
}

createZip().catch(err => {
  console.error(err);
  process.exit(1);
});
