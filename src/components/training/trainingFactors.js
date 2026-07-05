export const TRAINING_FACTOR_OPTIONS = [
  { key: 'sleep_hours', label: 'Sleep Hours', shortLabel: 'Sleep' },
  { key: 'location', label: 'Location', shortLabel: 'Loc' },
  { key: 'vert', label: 'Vert', shortLabel: 'Vert' },
  { key: 'weight', label: 'Weight', shortLabel: 'Weight' },
  { key: 'rhr', label: 'RHR', shortLabel: 'RHR' },
];

const VALID_FACTOR_KEYS = new Set(TRAINING_FACTOR_OPTIONS.map((option) => option.key));

export const normalizeTrainingFactorPreferences = (value) => {
  if (Array.isArray(value)) {
    return value.filter((key, index, keys) => (
      VALID_FACTOR_KEYS.has(key) && keys.indexOf(key) === index
    ));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key, enabled]) => VALID_FACTOR_KEYS.has(key) && Boolean(enabled))
      .map(([key]) => key);
  }

  return [];
};

export const sanitizeTrainingFactors = (value = {}) => (
  Object.fromEntries(
    Object.entries(value || {})
      .filter(([key]) => VALID_FACTOR_KEYS.has(key))
      .map(([key, rawValue]) => [key, String(rawValue ?? '').trim()])
      .filter(([, nextValue]) => nextValue.length > 0)
  )
);

export const getTrainingFactorEntries = (value = {}) => {
  const sanitized = sanitizeTrainingFactors(value);

  return TRAINING_FACTOR_OPTIONS
    .filter((option) => sanitized[option.key])
    .map((option) => ({
      ...option,
      value: sanitized[option.key],
    }));
};

export const hasTrainingFactors = (value = {}) => getTrainingFactorEntries(value).length > 0;

export const getVisibleTrainingFactorOptions = (activeKeys = [], values = {}) => {
  const savedKeys = new Set(getTrainingFactorEntries(values).map((entry) => entry.key));
  const normalizedActiveKeys = normalizeTrainingFactorPreferences(activeKeys);

  return TRAINING_FACTOR_OPTIONS.filter((option) => (
    normalizedActiveKeys.includes(option.key) || savedKeys.has(option.key)
  ));
};
