const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');

// 1. Build a map of exact filesystem casing for every directory and file in src
function getExactFsEntries(dir) {
  const result = new Map();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    result.set(entry.name.toLowerCase(), entry.name);
  }
  return result;
}

function verifyPathCasing(targetPath) {
  // targetPath is an absolute path
  const root = path.parse(targetPath).root;
  let relative = path.relative(root, targetPath);
  const segments = relative.split(path.sep);

  let current = root;
  for (const segment of segments) {
    if (!segment) continue;
    if (!fs.existsSync(current)) return { exists: false };
    const entries = fs.readdirSync(current);
    const match = entries.find(e => e.toLowerCase() === segment.toLowerCase());
    if (!match) {
      return { exists: false, failedSegment: segment, inDir: current };
    }
    if (match !== segment) {
      return {
        mismatch: true,
        expected: match,
        actual: segment,
        inDir: current
      };
    }
    current = path.join(current, match);
  }
  return { exists: true, mismatch: false };
}

// Collect all source files
function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = getAllFiles(srcDir);
console.log(`Auditing ${allFiles.length} files across src/ for case-sensitivity issues...`);

const importRegex = /(?:import\s+(?:[\s\S]*?from\s+)?['"](.*?)['"])|(?:require\(['"](.*?)['"]\))/g;

let issuesFound = 0;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    let match;
    const regex = new RegExp(importRegex);
    while ((match = regex.exec(line)) !== null) {
      const importPath = match[1] || match[2];
      if (!importPath) continue;

      // Only check relative or @/ imports
      let resolvedTarget = null;
      if (importPath.startsWith('@/')) {
        resolvedTarget = path.join(srcDir, importPath.slice(2));
      } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        resolvedTarget = path.resolve(path.dirname(filePath), importPath);
      }

      if (resolvedTarget) {
        // Check if file exists as-is, or with extensions
        let exactFile = null;
        const possibleExts = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts', '.css', '.json', '/index.ts', '/index.tsx', '/index.js'];
        
        for (const ext of possibleExts) {
          const candidate = resolvedTarget + ext;
          if (fs.existsSync(candidate)) {
            // Found candidate on disk, now verify every path segment's exact case
            const check = verifyPathCasing(candidate);
            if (check.mismatch) {
              issuesFound++;
              console.log(`[CASE MISMATCH] File: ${path.relative(process.cwd(), filePath)}:${lineIdx + 1}`);
              console.log(`  Imported: "${importPath}"`);
              console.log(`  Mismatch: "${check.actual}" should be "${check.expected}" in ${check.inDir}`);
            }
            exactFile = candidate;
            break;
          }
        }

        if (!exactFile) {
          issuesFound++;
          console.log(`[UNRESOLVED IMPORT] File: ${path.relative(process.cwd(), filePath)}:${lineIdx + 1}`);
          console.log(`  Imported: "${importPath}"`);
        }
      }
    }
  });
}

console.log(`\nImport audit completed with ${issuesFound} issues found.`);

// 2. Audit Next.js app directory structure
console.log('\nAuditing Next.js App Router structure in src/app...');
const appDir = path.join(srcDir, 'app');

function auditAppDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check directory name - Next.js convention is lowercase or [param]
      if (entry.name !== entry.name.toLowerCase() && !entry.name.startsWith('[') && !entry.name.startsWith('(')) {
        console.warn(`[WARNING] Directory in app/ is not lowercase: ${entry.name}`);
      }
      const subEntries = fs.readdirSync(full);
      if (subEntries.length === 0) {
        console.warn(`[EMPTY DIRECTORY] Empty directory in app: ${path.relative(srcDir, full)}`);
      }
      auditAppDir(full);
    }
  }
}
auditAppDir(appDir);

// 3. Verify page.tsx and layout.tsx default exports
const rootPage = path.join(appDir, 'page.tsx');
const rootLayout = path.join(appDir, 'layout.tsx');

if (fs.existsSync(rootPage)) {
  const pageSrc = fs.readFileSync(rootPage, 'utf8');
  if (!pageSrc.includes('export default')) {
    console.error('[ERROR] src/app/page.tsx missing export default!');
  } else {
    console.log('[OK] src/app/page.tsx has default export.');
  }
} else {
  console.error('[ERROR] src/app/page.tsx is missing!');
}

if (fs.existsSync(rootLayout)) {
  const layoutSrc = fs.readFileSync(rootLayout, 'utf8');
  if (!layoutSrc.includes('export default')) {
    console.error('[ERROR] src/app/layout.tsx missing export default!');
  } else {
    console.log('[OK] src/app/layout.tsx has default export.');
  }
} else {
  console.error('[ERROR] src/app/layout.tsx is missing!');
}
