module.exports = [
  { input: 'We should organize the event.', expectedRuleIds: ['s01', 'sx46'] },
  { input: 'The adviser will fill in a form.', expectedRuleIds: [] },
  { input: 'This is no-one anymore.', expectedRuleIds: ['s28', 's29'] },
  { input: 'The report mentions GDP and then BBC.', expectedRuleIds: [] },
  { input: 'A senior adviser discussed the program.', expectedRuleIds: ['s39'] }
];
