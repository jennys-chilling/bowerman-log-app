const rpeDefinitions = [
  [1, 'Very easy', 'rpe-1'],
  [2, 'Easy', 'rpe-2'],
  [3, 'Controlled', 'rpe-3'],
  [4, 'Moderate', 'rpe-4'],
  [5, 'Steady', 'rpe-5'],
  [6, 'Working', 'rpe-6'],
  [7, 'Hard', 'rpe-7'],
  [8, 'Very hard', 'rpe-8'],
  [9, 'Near max', 'rpe-9'],
  [10, 'Max', 'rpe-10'],
];

const makeRpeColorClasses = (className, label) => ({
  label,
  badge: `rpe-badge ${className}`,
  surface: `rpe-surface ${className}`,
  labelText: `rpe-label ${className}`,
  range: `rpe-range ${className}`,
  track: `rpe-track ${className}`,
  thumb: `rpe-thumb ${className}`,
  solid: `rpe-solid ${className}`,
});

export const rpeColorScale = Object.fromEntries(
  rpeDefinitions.map(([level, label, className]) => [level, makeRpeColorClasses(className, label)])
);

export const neutralRpeColor = {
  label: 'Not set',
  badge: 'rpe-badge rpe-neutral',
  surface: 'rpe-surface rpe-neutral',
  labelText: 'rpe-label rpe-neutral',
  range: 'rpe-range rpe-neutral',
  track: 'rpe-track rpe-neutral',
  thumb: 'rpe-thumb rpe-neutral',
  solid: 'rpe-solid rpe-neutral',
};

export function getRpeColorClasses(rpe) {
  const numericRpe = Number(rpe);
  return rpeColorScale[numericRpe] || neutralRpeColor;
}
