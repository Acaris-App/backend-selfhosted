const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, '..', '..', 'services');
const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
};

if (fs.existsSync(servicesDir)) {
  const services = fs.readdirSync(servicesDir);
  for (const service of services) {
    const srcDir = path.join(servicesDir, service, 'src');
    if (fs.existsSync(srcDir)) {
      walk(srcDir);
    }
  }
}

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
