const fs = require('fs');
const vm = require('vm');
const cases = require('../tests/rule-harness-cases');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>[\s\S]*<\/script>/);
if (!match) throw new Error('No inline script found.');
const js = match[0].replace(/^<script>|<\/script>$/g, '');

const sandbox = {
  console,
  document: {
    getElementById: () => ({ value: '', textContent: '', style: {}, innerHTML: '', className: '', classList: { add() {}, remove() {}, toggle() {} } }),
    querySelectorAll: () => ({ forEach() {} }),
    querySelector: () => null,
    addEventListener: () => {}
  },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  alert: () => {}
};
vm.createContext(sandbox);
vm.runInContext(js, sandbox);

let failed = 0;
for (const c of cases) {
  const actual = [...new Set(sandbox.runChecks(c.input, { enableStructureChecks: false }).map((f) => f.ruleId))].sort();
  const expected = [...c.expectedRuleIds].sort();
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failed++;
    console.error(`[FAIL] input=${JSON.stringify(c.input)} expected=${expected.join(',')} actual=${actual.join(',')}`);
  } else {
    console.log(`[OK] input=${JSON.stringify(c.input)}`);
  }
}

if (failed) process.exit(1);
console.log(`Simple harness passed (${cases.length} cases).`);
