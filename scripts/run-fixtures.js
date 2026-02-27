const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!js) throw new Error('Script block not found');

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
  let fixtureFailed = 0;
  const findings = sandbox.runChecks(fx.text);
  const ids = new Set(findings.map(f => f.ruleId));

  for (const id of fx.expectPresent || []) {
    if (!ids.has(id)) {
      console.error(`[FAIL] ${fx.name}: missing expected rule ${id}`);
      failed++;
      fixtureFailed++;
    }
  }
  for (const id of fx.expectAbsent || []) {
    if (ids.has(id)) {
      console.error(`[FAIL] ${fx.name}: unexpected rule ${id}`);
      failed++;
      fixtureFailed++;
    }
  }
  if (fixtureFailed === 0) {
    console.log(`[OK] ${fx.name}`);
  } else {
    console.error(`[FAIL] ${fx.name}: ${fixtureFailed} assertion${fixtureFailed === 1 ? '' : 's'} failed`);
  }
}

if (failed) process.exit(1);
console.log('Fixture checks passed.');
