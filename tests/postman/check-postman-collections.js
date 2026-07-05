const fs = require('fs');
const path = require('path');

const testsDir = __dirname;
const files = fs.readdirSync(testsDir)
  .filter((name) => name.endsWith('.postman_collection.json'))
  .map((name) => path.join(testsDir, name));

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  JSON.parse(raw);
  console.log(`Valid JSON: ${path.relative(process.cwd(), file)}`);
}

console.log(`Postman collection check passed for ${files.length} files.`);
