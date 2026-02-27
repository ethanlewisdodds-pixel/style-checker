const fs = require('fs');
const vm = require('vm');

const SCRIPT_BLOCK_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const RULES_MARKER = '// RULES ENGINE';

function extractCheckerScript(html) {
  const scriptBlocks = [...html.matchAll(SCRIPT_BLOCK_RE)];
  if (!scriptBlocks.length) {
    throw new Error('No <script> blocks found in index.html. Add an inline checker script containing "// RULES ENGINE".');
  }

  const markedBlocks = scriptBlocks.filter((match) => match[1].includes(RULES_MARKER));
  if (markedBlocks.length === 1) return markedBlocks[0][1];

  if (!markedBlocks.length) {
    if (scriptBlocks.length === 1) return scriptBlocks[0][1];
    throw new Error(`Found ${scriptBlocks.length} <script> blocks in index.html but none include "${RULES_MARKER}". Mark the checker script explicitly.`);
  }

  throw new Error(`Found ${markedBlocks.length} <script> blocks containing "${RULES_MARKER}". Keep exactly one checker script block.`);
}

const html = fs.readFileSync('index.html', 'utf8');
const js = extractCheckerScript(html);

const sandbox = {
  console,
  document: {
    getElementById: () => ({ value: '', textContent: '', style: {}, innerHTML: '', className: '', classList: { add() {}, remove() {}, toggle() {} } }),
    querySelectorAll: () => ({ forEach() {} })
  },
  alert: () => {}
};
vm.createContext(sandbox);
vm.runInContext(js, sandbox);

const fixtures = JSON.parse(fs.readFileSync('tests/rules-fixtures.json', 'utf8'));
let failed = 0;

for (const fx of fixtures) {
  const findings = sandbox.runChecks(fx.text);
  const ids = new Set(findings.map(f => f.ruleId));

  for (const id of fx.expectPresent || []) {
    if (!ids.has(id)) {
      console.error(`[FAIL] ${fx.name}: missing expected rule ${id}`);
      failed++;
    }
  }
  for (const id of fx.expectAbsent || []) {
    if (ids.has(id)) {
      console.error(`[FAIL] ${fx.name}: unexpected rule ${id}`);
      failed++;
    }
  }
  if (!(fx.expectPresent || []).length && !(fx.expectAbsent || []).length) {
    console.log(`[OK] ${fx.name}`);
  } else if (failed === 0) {
    console.log(`[OK] ${fx.name}`);
  }
}

if (failed) process.exit(1);
console.log('Fixture checks passed.');
