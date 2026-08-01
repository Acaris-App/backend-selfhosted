const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const seed2020 = read('services/ai-document-service/src/scripts/seed-curriculum-2020.js');
const seed2025 = read('services/ai-document-service/src/scripts/seed-curriculum-2025.js');
const migration = read('migrations/20260731_harden_curriculum_sources.sql');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert((seed2020.match(/\n  (?:RPL|DAI|JKK|SIT): \[/g) || []).length === 4,
  'TI-2020 seed must retain four concentration groups.');
assert(seed2020.includes("RPL: 'Rekayasa Perangkat Lunak'") &&
  seed2020.includes("JKK: 'Teknik Komputer'") &&
  seed2020.includes("SIT: 'Teknologi Informasi'") &&
  seed2020.includes("DAI: 'Sistem Cerdas'"),
  'TI-2020 seed must use the four official concentration names.');
assert((seed2025.match(/\n  (?:SK|RPL|TI): \[/g) || []).length === 3,
  'TI-2025 seed must define exactly three concentration groups.');
assert(seed2025.includes("SK: ['INF625306'") &&
  seed2025.includes("RPL: ['INF625313'") &&
  seed2025.includes("TI: ['INF625315'"),
  'TI-2025 seed must map courses to all three concentrations.');
assert(migration.includes("'proposed'") && migration.includes("'verified'"),
  'Migration must retain prerequisite verification states.');

console.log('Self-hosted curriculum catalog checks passed.');
