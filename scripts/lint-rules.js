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
let script = extractCheckerScript(html);
script += '\n;globalThis.__RULES__ = RULES;';

const sandbox = {
  console,
  document: {
    getElementById: () => ({ value: '', textContent: '', style: {}, innerHTML: '', className: '', classList: { add() {}, remove() {}, toggle() {} } }),
    querySelectorAll: () => ({ forEach() {} })
  },
  alert: () => {}
};
vm.createContext(sandbox);
vm.runInContext(script, sandbox);

const rules = sandbox.__RULES__ || [];
if (!Array.isArray(rules) || !rules.length) throw new Error('Could not load RULES from script context');

const seen = new Set();
const dupes = [];
for (const r of rules) {
  if (!r.id) continue;
  if (seen.has(r.id)) dupes.push(r.id);
  seen.add(r.id);
}
if (dupes.length) {
  console.error('Duplicate rule IDs found:', [...new Set(dupes)].join(', '));
  process.exit(1);
}

for (const r of rules) {
  if (Object.prototype.toString.call(r.find) !== '[object RegExp]') {
    console.error('Rule has non-RegExp find:', r.id);
    process.exit(1);
  }
  new RegExp(r.find.source, r.find.flags);
}

console.log(`Rule lint passed: ${rules.length} rules validated.`);
