/**
 * Download Tesseract OCR libraries on demand.
 * Keeps repository and extension package lightweight (<200KB).
 * Run: node scripts/download_ocr_libs.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '..', 'lib', 'tesseract');

const files = [
  {
    name: 'tesseract.min.js',
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js'
  },
  {
    name: 'worker.min.js',
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/worker.min.js'
  },
  {
    name: 'tesseract-core.wasm.js',
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.1/tesseract-core.wasm.js'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    function get(currentUrl) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return get(response.headers.location);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        }

        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\rDownloading ${path.basename(dest)}: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`);
          } else {
            process.stdout.write(`\rDownloading ${path.basename(dest)}: ${(downloaded / 1024 / 1024).toFixed(2)}MB`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log(`\n✓ Saved ${path.basename(dest)}`);
            resolve();
          });
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    }

    get(url);
  });
}

async function main() {
  console.log('=== Downloading Tesseract OCR dependencies ===');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const item of files) {
    const dest = path.join(targetDir, item.name);
    console.log(`\nFetching ${item.name} from ${item.url}...`);
    try {
      await downloadFile(item.url, dest);
    } catch (err) {
      console.error(`Error downloading ${item.name}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 All OCR dependencies successfully downloaded into lib/tesseract/!');
  console.log('You can now reload the extension and use Screenshot OCR (Alt+S).');
}

main();
