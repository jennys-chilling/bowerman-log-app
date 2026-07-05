export const WORKOUT_TYPE_MENU = [
  { label: 'Off', value: 'Off' },
  { label: 'Easy Run', value: 'Easy Run' },
  {
    label: 'Workout',
    options: [
      { label: 'Hills', value: 'Workout > Hills' },
      { label: 'Tempo', value: 'Workout > Tempo' },
      { label: 'Tempo Repeats', value: 'Workout > Tempo Repeats' },
      { label: 'Intervals', value: 'Workout > Intervals' },
      { label: 'Fartlek', value: 'Workout > Fartlek' },
      { label: 'Track Fartlek', value: 'Workout > Track Fartlek' },
    ],
  },
  {
    label: 'Long Run',
    options: [
      { label: 'Structured LR', value: 'Long Run > Structured LR' },
      { label: 'Specific LR', value: 'Long Run > Specific LR' },
      { label: 'Regular LR', value: 'Long Run > Regular LR' },
    ],
  },
  { label: 'Boost', value: 'Boost' },
  { label: 'Race', value: 'Race' },
  {
    label: 'X-Train',
    options: [
      { label: 'Elliptical', value: 'X-Train > Elliptical' },
      { label: 'Bike', value: 'X-Train > Bike' },
      { label: 'Swim', value: 'X-Train > Swim' },
      { label: 'Ski', value: 'X-Train > Ski' },
    ],
  },
];

export const WORKOUT_TYPE_GROUPS = WORKOUT_TYPE_MENU.map((item) => ({
  label: item.label,
  options: item.options?.map((option) => option.value) || [item.value],
}));
export const WORKOUT_TYPES = WORKOUT_TYPE_GROUPS.flatMap((group) => group.options);
export const LEGACY_WORKOUT_TYPES = ['Workout', 'Long Run', 'X-Train'];
const ALL_WORKOUT_TYPES = [...WORKOUT_TYPES, ...LEGACY_WORKOUT_TYPES];
const WORKOUT_TYPE_LABELS = Object.fromEntries(
  WORKOUT_TYPE_MENU.flatMap((item) => (
    item.options?.map((option) => [option.value, option.label]) || [[item.value, item.label]]
  ))
);
export const WORKOUT_TYPE_SEPARATOR = ' OR ';

export const parseWorkoutTypes = (value) => {
  if (Array.isArray(value)) {
    return value.filter((type) => ALL_WORKOUT_TYPES.includes(type));
  }

  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(/\s+OR\s+/i)
    .map((type) => type.trim())
    .filter((type) => ALL_WORKOUT_TYPES.includes(type));
};

export const formatWorkoutTypes = (types = []) => (
  ALL_WORKOUT_TYPES
    .filter((type) => types.includes(type))
    .join(WORKOUT_TYPE_SEPARATOR)
);

export const displayWorkoutType = (type = '') => (
  WORKOUT_TYPE_LABELS[type] || type.split(' > ').pop() || type
);

export const displayWorkoutTypes = (value = '') => {
  const selectedTypes = parseWorkoutTypes(value);
  if (selectedTypes.length > 0) {
    return selectedTypes.map(displayWorkoutType).join(WORKOUT_TYPE_SEPARATOR);
  }

  if (Array.isArray(value)) {
    return value.map(displayWorkoutType).join(WORKOUT_TYPE_SEPARATOR);
  }

  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .split(/\s+OR\s+/i)
    .map((type) => displayWorkoutType(type.trim()))
    .filter(Boolean)
    .join(WORKOUT_TYPE_SEPARATOR);
};

export const isWorkoutCategory = (type = '', category = '') => (
  type === category ||
  type.startsWith(`${category} >`)
);

export const hasWorkoutCategory = (value = '', category = '') => (
  parseWorkoutTypes(value).some((type) => isWorkoutCategory(type, category))
);

export const matchesWorkoutTypeFilter = (value = '', filter = '') => (
  parseWorkoutTypes(value).some((type) => (
    type === filter ||
    isWorkoutCategory(type, filter)
  ))
);

export const matchesWorkoutTypeFilters = (value = '', filters = []) => {
  const activeFilters = filters.filter(Boolean);
  if (activeFilters.length === 0) return true;
  return activeFilters.some((filter) => matchesWorkoutTypeFilter(value, filter));
};

export const isOffType = (value = '') => parseWorkoutTypes(value).includes('Off');
export const isXTrainType = (value = '') => hasWorkoutCategory(value, 'X-Train');
export const isBikeType = (value = '') => parseWorkoutTypes(value).includes('X-Train > Bike');

export const allowsActivityMileage = (value = '') => {
  const selectedTypes = parseWorkoutTypes(value);
  if (selectedTypes.length === 0) return true;
  if (isOffType(value)) return false;
  return !isXTrainType(value) || isBikeType(value);
};

export const countsAsRunMileage = (value = '') => {
  const selectedTypes = parseWorkoutTypes(value);
  if (selectedTypes.length === 0) return true;
  return !isOffType(value) && !isXTrainType(value);
};

export const canHaveStrides = (value = '') => (
  parseWorkoutTypes(value).some((type) => (
    !isWorkoutCategory(type, 'X-Train') &&
    type !== 'Off'
  ))
);

export const emptyAthleteActivity = {
  session_type: '',
  duration_minutes: 0,
  mileage: 0,
  shoes: [],
  shoe_mileage: {},
  strides: false,
  rpe: null,
  comments: '',
};

export const emptyCoachActivity = {
  workout_type: '',
  planned_difficulty: null,
  strides: false,
  prescription: '',
  coach_notes: '',
};

export const emptyCoachLift = {
  lift_type: '',
  duration_minutes: 0,
  prescription: '',
  coach_notes: '',
};

export const neutralWorkoutBadgeClass =
  'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export const hasAthleteActivityData = (activity = {}) => (
  Boolean(activity.session_type) ||
  Number(activity.duration_minutes) > 0 ||
  Number(activity.mileage) > 0 ||
  Boolean(activity.shoes?.length) ||
  Boolean(activity.strides) ||
  activity.rpe !== null && activity.rpe !== undefined ||
  Boolean(activity.comments?.trim())
);

export const getAthleteActivities = (session = {}) => {
  if (Array.isArray(session.activities)) {
    return session.activities.map((activity) => ({ ...emptyAthleteActivity, ...activity }));
  }

  return hasAthleteActivityData(session)
    ? [{ ...emptyAthleteActivity, ...session }]
    : [];
};

export const hasAthleteSessionData = (session = {}) => getAthleteActivities(session).some(hasAthleteActivityData);

export const sanitizeAthleteActivity = (activity = {}) => {
  const sessionType = activity.session_type || '';
  const allowMileage = allowsActivityMileage(sessionType);
  const countAsRun = countsAsRunMileage(sessionType);

  return {
    ...activity,
    session_type: sessionType,
    duration_minutes: Number(activity.duration_minutes) || 0,
    mileage: allowMileage ? Number(activity.mileage) || 0 : 0,
    shoes: countAsRun ? activity.shoes || [] : [],
    shoe_mileage: countAsRun ? Object.fromEntries(
      Object.entries(activity.shoe_mileage || {})
        .map(([shoeId, mileage]) => [shoeId, Number(mileage) || 0])
        .filter(([, mileage]) => mileage > 0)
    ) : {},
    strides: canHaveStrides(sessionType) ? Boolean(activity.strides) : false,
    rpe: activity.rpe === null || activity.rpe === undefined ? null : Number(activity.rpe),
    comments: activity.comments || '',
  };
};

export const makeAthleteSession = (activities = []) => {
  const cleaned = activities
    .map(sanitizeAthleteActivity)
    .filter(hasAthleteActivityData);

  if (cleaned.length === 0) {
    return {};
  }

  return {
    ...cleaned[0],
    activities: cleaned,
  };
};

export const getSessionMileage = (session = {}) => getAthleteActivities(session).reduce((sum, activity) => {
  if (!countsAsRunMileage(activity.session_type)) return sum;
  return sum + (Number(activity.mileage) || 0);
}, 0);

export const getSessionDuration = (session = {}) => getAthleteActivities(session).reduce((sum, activity) => {
  if (activity.session_type === 'Off') return sum;
  return sum + (Number(activity.duration_minutes) || 0);
}, 0);

export const hasCoachActivityData = (activity = {}) => (
  Boolean(activity.workout_type) ||
  activity.planned_difficulty !== null && activity.planned_difficulty !== undefined ||
  Boolean(activity.strides) ||
  Boolean(activity.prescription?.trim()) ||
  Boolean(activity.coach_notes?.trim())
);

export const getCoachActivities = (session = {}) => {
  if (Array.isArray(session.activities)) {
    return session.activities.map((activity) => ({ ...emptyCoachActivity, ...activity }));
  }

  return hasCoachActivityData(session)
    ? [{ ...emptyCoachActivity, ...session }]
    : [];
};

export const hasCoachSessionData = (session = {}) => getCoachActivities(session).some(hasCoachActivityData);

export const sanitizeCoachActivity = (activity = {}) => {
  const workoutType = formatWorkoutTypes(parseWorkoutTypes(activity.workout_type)) || activity.workout_type || '';

  return {
    ...activity,
    workout_type: workoutType,
    planned_difficulty:
      activity.planned_difficulty === null || activity.planned_difficulty === undefined || activity.planned_difficulty === ''
        ? null
        : Number(activity.planned_difficulty),
    strides: canHaveStrides(workoutType) ? Boolean(activity.strides) : false,
    prescription: activity.prescription || '',
    coach_notes: activity.coach_notes || '',
  };
};

export const makeCoachSession = (activities = []) => {
  const cleaned = activities
    .map(sanitizeCoachActivity)
    .filter(hasCoachActivityData);

  if (cleaned.length === 0) {
    return {};
  }

  return {
    ...cleaned[0],
    activities: cleaned,
  };
};

export const hasCoachLiftData = (lift = {}) => (
  Boolean(lift.lift_type?.trim()) ||
  Number(lift.duration_minutes) > 0 ||
  Boolean(lift.prescription?.trim()) ||
  Boolean(lift.coach_notes?.trim())
);

export const sanitizeCoachLift = (lift = {}) => {
  const cleaned = {
    lift_type: lift.lift_type || '',
    duration_minutes: Number(lift.duration_minutes) || 0,
    prescription: lift.prescription || '',
    coach_notes: lift.coach_notes || '',
  };

  return hasCoachLiftData(cleaned) ? cleaned : {};
};
