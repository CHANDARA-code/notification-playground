const fs = require('fs');
const path = require('path');

const ormRoot = path.join(__dirname, '..', 'node_modules', 'drizzle-orm');
const pkgPath = path.join(ormRoot, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('drizzle-orm not installed; skipping patch.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.exports = pkg.exports || {};

const ensureExport = (subpath, target) => {
  if (!pkg.exports[`./${subpath}`]) {
    pkg.exports[`./${subpath}`] = {
      import: { types: `${target}.d.ts`, default: `${target}.js` },
      require: { types: `${target}.d.cts`, default: `${target}.cjs` },
      types: `${target}.d.ts`,
      default: `${target}.js`,
    };
  }
};

const ensureStub = (subpath, target) => {
  const dir = path.join(ormRoot, subpath);
  const targetPath = target.startsWith('.') ? target : `../${target}`;

  fs.mkdirSync(dir, { recursive: true });

  const cjs = path.join(dir, 'index.cjs');
  if (!fs.existsSync(cjs)) {
    fs.writeFileSync(
      cjs,
      `module.exports = require('${targetPath}');\n`,
    );
  }

  const js = path.join(dir, 'index.js');
  if (!fs.existsSync(js)) {
    fs.writeFileSync(
      js,
      `export * from '${targetPath}/index.js';\nexport { default } from '${targetPath}/index.js';\n`,
    );
  }
};

const stubs = {
  '_relations': './relations',
  'cockroach-core': 'pg-core',
  'cockroach': 'pg-core',
  'cockroach/migrator': 'node-postgres/migrator',
  'mssql-core': 'pg-core',
  'node-mssql': 'pg-core',
  'node-mssql/migrator': 'node-postgres/migrator',
  'sqlite-cloud': 'sqlite-core',
  'sqlite-cloud/migrator': 'better-sqlite3/migrator',
  'tursodatabase/database': 'libsql',
  'tursodatabase/migrator': 'libsql/migrator',
};

for (const [subpath, target] of Object.entries(stubs)) {
  if (subpath === '_relations') {
    ensureExport('_relations', './relations');
    const relJs = path.join(ormRoot, '_relations.js');
    const relCjs = path.join(ormRoot, '_relations.cjs');
    if (!fs.existsSync(relCjs)) {
      fs.writeFileSync(relCjs, `module.exports = require('./relations.cjs');\n`);
    }
    if (!fs.existsSync(relJs)) {
      fs.writeFileSync(relJs, `export * from './relations.js';\nexport { default } from './relations.js';\n`);
    }
    continue;
  }

  ensureExport(subpath, `./${subpath}/index`);
  ensureStub(subpath, target);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

const versionFiles = [
  path.join(ormRoot, 'version.js'),
  path.join(ormRoot, 'version.cjs'),
];

for (const file of versionFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(/compatibilityVersion\s*=\s*\d+/g, 'compatibilityVersion = 12');
  if (updated !== content) {
    fs.writeFileSync(file, updated);
  }
}

console.log('Patched drizzle-orm exports and compatibility for drizzle-kit.');
