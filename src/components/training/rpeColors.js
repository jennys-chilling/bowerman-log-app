export const rpeColorScale = {
  1: {
    label: 'Very easy',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    labelText: 'text-emerald-700 dark:text-emerald-300',
    range: 'bg-emerald-500',
    track: 'bg-emerald-100 dark:bg-emerald-950',
    thumb: 'border-emerald-500 focus-visible:ring-emerald-500',
  },
  2: {
    label: 'Easy',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    labelText: 'text-emerald-700 dark:text-emerald-300',
    range: 'bg-emerald-500',
    track: 'bg-emerald-100 dark:bg-emerald-950',
    thumb: 'border-emerald-500 focus-visible:ring-emerald-500',
  },
  3: {
    label: 'Controlled',
    badge: 'border-lime-200 bg-lime-100 text-lime-800 dark:border-lime-900 dark:bg-lime-950 dark:text-lime-200',
    labelText: 'text-lime-700 dark:text-lime-300',
    range: 'bg-lime-500',
    track: 'bg-lime-100 dark:bg-lime-950',
    thumb: 'border-lime-500 focus-visible:ring-lime-500',
  },
  4: {
    label: 'Moderate',
    badge: 'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
    labelText: 'text-yellow-700 dark:text-yellow-300',
    range: 'bg-yellow-500',
    track: 'bg-yellow-100 dark:bg-yellow-950',
    thumb: 'border-yellow-500 focus-visible:ring-yellow-500',
  },
  5: {
    label: 'Steady',
    badge: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    labelText: 'text-amber-700 dark:text-amber-300',
    range: 'bg-amber-500',
    track: 'bg-amber-100 dark:bg-amber-950',
    thumb: 'border-amber-500 focus-visible:ring-amber-500',
  },
  6: {
    label: 'Working',
    badge: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200',
    labelText: 'text-orange-700 dark:text-orange-300',
    range: 'bg-orange-500',
    track: 'bg-orange-100 dark:bg-orange-950',
    thumb: 'border-orange-500 focus-visible:ring-orange-500',
  },
  7: {
    label: 'Hard',
    badge: 'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200',
    labelText: 'text-orange-800 dark:text-orange-300',
    range: 'bg-orange-600',
    track: 'bg-orange-100 dark:bg-orange-950',
    thumb: 'border-orange-600 focus-visible:ring-orange-600',
  },
  8: {
    label: 'Very hard',
    badge: 'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
    labelText: 'text-red-700 dark:text-red-300',
    range: 'bg-red-500',
    track: 'bg-red-100 dark:bg-red-950',
    thumb: 'border-red-500 focus-visible:ring-red-500',
  },
  9: {
    label: 'Near max',
    badge: 'border-red-700 bg-red-700 text-white dark:border-red-700 dark:bg-red-900 dark:text-white',
    labelText: 'text-red-700 dark:text-red-300',
    range: 'bg-red-700',
    track: 'bg-red-100 dark:bg-red-950',
    thumb: 'border-red-700 focus-visible:ring-red-700',
  },
  10: {
    label: 'Max',
    badge: 'border-red-900 bg-red-900 text-white dark:border-red-800 dark:bg-red-950 dark:text-white',
    labelText: 'text-red-900 dark:text-red-200',
    range: 'bg-red-900',
    track: 'bg-red-100 dark:bg-red-950',
    thumb: 'border-red-900 focus-visible:ring-red-900',
  },
};

export const neutralRpeColor = {
  label: 'Not set',
  badge: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
  labelText: 'text-slate-500 dark:text-slate-400',
  range: 'bg-slate-400',
  track: 'bg-slate-200 dark:bg-slate-800',
  thumb: 'border-slate-400 focus-visible:ring-slate-400',
};

export function getRpeColorClasses(rpe) {
  const numericRpe = Number(rpe);
  return rpeColorScale[numericRpe] || neutralRpeColor;
}
