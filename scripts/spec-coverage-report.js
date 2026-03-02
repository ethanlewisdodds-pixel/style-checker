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

const probes = [
  { key: 'spelling: alright', text: 'It is alright to continue.' },
  { key: 'spelling: disorientated', text: 'She felt disorientated after the spin.' },
  { key: 'spelling: despatched', text: 'The memo was despatched yesterday.' },
  { key: 'hyphen: first-past-the-post', text: 'The first past the post system is used.' },
  { key: 'hyphen: co-operation', text: 'This requires cooperation across teams.' },
  { key: 'hyphen: re-election', text: 'He announced reelection plans.' },
  { key: 'hyphen: cyber-risk', text: 'Boards reviewed each cyber risk.' },
  { key: 'hyphen: short-term adjective', text: 'It is a short term fix.' },
  { key: 'capital: Prime Minister', text: 'The prime minister spoke today.' },
  { key: 'capital: The Hague', text: 'She travelled to the hague yesterday.' },
  { key: 'capital: Rt Hon', text: 'The rt hon member spoke.' },
  { key: 'capital lower: government', text: 'The UK Government published plans.' },
  { key: 'numbers: percent symbol', text: 'Inflation hit 5% in April.' },
  { key: 'numbers: money bn format', text: 'The project cost £50 billion.' },
  { key: 'numbers: people million word', text: 'The city has 7bn people in this test sentence.' },
  { key: 'numbers: fraction digits', text: 'Only 2/3 of voters turned out.' },
  { key: 'numbers: date format', text: 'The event was on March 1, 2021.' },
  { key: 'numbers: time colon', text: 'They met at 10:30pm.' },
  { key: 'numbers: temperature degree', text: 'The room reached 30°C by noon.' },
  { key: 'punctuation: e.g.', text: 'He cited many examples, e.g., this one.' },
  { key: 'punctuation: em dash', text: 'He left — and never returned.' },
  { key: 'preferred: approximately', text: 'Approximately 20 people attended.' },
  { key: 'preferred: planes military', text: 'Military planes were deployed.' },
  { key: 'proper noun: Thérèse Coffey accent', text: 'Therese Coffey commented.' },
  { key: 'proper noun: Sinn Féin accent', text: 'Sinn Fein announced a policy.' },
  { key: 'proper noun: Hongkongers', text: 'Many Hong Kongers marched.' },
  { key: 'americanism: center->centre', text: 'The center has a new color scheme.' },
  { key: 'format: No 10 style', text: 'A meeting was held at No. 10 today.' },
  { key: 'format: OK style', text: 'He said okay and moved on.' },
  { key: 'context review: alternative for 3+', text: 'There are four alternatives on the ballot.' }
];

let passed = 0;
const misses = [];
for (const probe of probes) {
  const findings = sandbox.runChecks(probe.text);
  if (findings.length > 0) {
    passed++;
  } else {
    misses.push(probe.key);
  }
}

console.log(`Probes triggered: ${passed}/${probes.length}`);
if (misses.length) {
  console.log('Missing probe coverage:');
  misses.forEach((m) => console.log(`- ${m}`));
}
