import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const MANIFEST_PATH = path.join(DIST_DIR, '.vite', 'manifest.json');
const INITIAL_JS_BUDGET = 250_000;
const ARTICLE_BODY_MARKER = '很多同学在找 AI 论文降重工具时';

if (!fs.existsSync(MANIFEST_PATH)) {
  throw new Error('Missing dist/.vite/manifest.json. Run npm run build first.');
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const entries = Object.entries(manifest);
const entryPair = entries.find(([, item]) => item.isEntry && item.src === 'index.html');

if (!entryPair) throw new Error('Could not find the index.html entry in the Vite manifest.');

const [entryKey] = entryPair;
const initialKeys = new Set();

function collectStaticImports(key) {
  if (initialKeys.has(key)) return;
  const item = manifest[key];
  if (!item) throw new Error(`Vite manifest import is missing: ${key}`);
  initialKeys.add(key);
  for (const importedKey of item.imports || []) collectStaticImports(importedKey);
}

collectStaticImports(entryKey);

const initialFiles = [...initialKeys]
  .map((key) => manifest[key].file)
  .filter((file) => file.endsWith('.js'));
const initialBytes = initialFiles.reduce(
  (total, file) => total + fs.statSync(path.join(DIST_DIR, file)).size,
  0,
);
const initialSource = initialFiles
  .map((file) => fs.readFileSync(path.join(DIST_DIR, file), 'utf8'))
  .join('\n');

const dynamicFiles = [...new Set(entries
  .filter(([key, item]) => !initialKeys.has(key) && item.file?.endsWith('.js'))
  .map(([, item]) => item.file))];
const articleChunk = dynamicFiles.find((file) =>
  fs.readFileSync(path.join(DIST_DIR, file), 'utf8').includes(ARTICLE_BODY_MARKER),
);
const declaredDynamicImports = entries.reduce(
  (total, [, item]) => total + (item.dynamicImports?.length || 0),
  0,
);

if (initialBytes >= INITIAL_JS_BUDGET) {
  throw new Error(`Initial JavaScript is ${initialBytes} bytes; budget is below ${INITIAL_JS_BUDGET} bytes.`);
}
if (declaredDynamicImports === 0 || dynamicFiles.length === 0) {
  throw new Error('No dynamic route/component chunks were emitted.');
}
if (initialSource.includes(ARTICLE_BODY_MARKER)) {
  throw new Error('A full blog article body leaked into the initial JavaScript closure.');
}
if (!articleChunk) {
  throw new Error('The article bodies were not found in a deferred JavaScript chunk.');
}

console.log(JSON.stringify({
  status: 'passed',
  initialBytes,
  budgetBytes: INITIAL_JS_BUDGET,
  initialFiles,
  dynamicChunkCount: dynamicFiles.length,
  articleChunk,
}, null, 2));
