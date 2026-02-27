const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
let script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error('No script block found in index.html');
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
