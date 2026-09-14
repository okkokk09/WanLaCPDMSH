import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found! Run npm run build first.');
  process.exit(1);
}

let html = fs.readFileSync(indexHtmlPath, 'utf-8');

// Find JS and CSS assets
const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);

const jsFile = assetFiles.find(f => f.endsWith('.js'));
const cssFile = assetFiles.find(f => f.endsWith('.css'));

if (cssFile) {
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
  html = html.replace(
    new RegExp(`<link[^>]*href=["']\\.?/assets/${cssFile}["'][^>]*>`, 'i'),
    `<style>\n${cssContent}\n</style>`
  );
}

if (jsFile) {
  const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
  html = html.replace(
    new RegExp(`<script[^>]*src=["']\\.?/assets/${jsFile}["'][^>]*></script>`, 'i'),
    `<script type="module">\n${jsContent}\n</script>`
  );
}

const standalonePath = path.join(rootDir, 'standalone.html');
fs.writeFileSync(standalonePath, html, 'utf-8');
console.log(`Successfully generated standalone.html (${(fs.statSync(standalonePath).size / 1024).toFixed(1)} KB)`);
