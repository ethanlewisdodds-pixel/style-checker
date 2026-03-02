const fs = require('fs');
const vm = require('vm');

const SCRIPT_BLOCK_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const RULES_MARKER = '// RULES ENGINE';

function extractCheckerScript(html) {
  const scriptBlocks = [...html.matchAll(SCRIPT_BLOCK_RE)];
  const markedBlocks = scriptBlocks.filter((m) => m[1].includes(RULES_MARKER));
  if (markedBlocks.length !== 1) throw new Error('Expected exactly one checker script block');
  return markedBlocks[0][1];
}

const KNOWN_DUP_REGEX = new Set([
  '\\bjudgement\\b__gi',
  '\\bsupreme court\\b__gi'
]);

const KNOWN_DUP_MESSAGE = new Set([
  'Use "Yemen" not "the Yemen"',
  'Use "A-level" (upper case A, lower case l)',
  'Use "O-level" (upper case O, lower case l)',
  'Use "Supreme Court" (upper case)'
]);

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
const bySource = new Map();
const byMessage = new Map();

for (const r of rules) {
  const source = `${r.find.source}__${r.find.flags}`;
  if (!bySource.has(source)) bySource.set(source, []);
  bySource.get(source).push(r);

  if (!byMessage.has(r.message)) byMessage.set(r.message, []);
  byMessage.get(r.message).push(r);
}

let issues = 0;
let known = 0;
for (const [source, list] of bySource.entries()) {
  if (list.length > 1) {
    if (KNOWN_DUP_REGEX.has(source)) {
      known++;
      continue;
    }
    issues++;
    console.error(`[DUP-REGEX] ${source} :: ${list.map((x) => x.id).join(', ')}`);
  }
}

for (const [message, list] of byMessage.entries()) {
  if (list.length > 1) {
    if (KNOWN_DUP_MESSAGE.has(message)) {
      known++;
      continue;
    }
    issues++;
    console.error(`[DUP-MSG] ${JSON.stringify(message)} :: ${list.map((x) => x.id).join(', ')}`);
  }
}

if (issues) {
  console.error(`Rule audit failed with ${issues} unapproved potential conflict(s).`);
  process.exit(1);
}

console.log(`Rule audit passed: ${rules.length} rules checked, ${known} known duplicate pattern(s) tolerated.`);
