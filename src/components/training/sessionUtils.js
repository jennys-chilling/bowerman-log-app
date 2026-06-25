export const WORKOUT_TYPES = ['Easy Run', 'Workout', 'Long Run', 'Boost', 'X-Train', 'Off', 'Race'];
export const WORKOUT_TYPE_SEPARATOR = ' OR ';

export const parseWorkoutTypes = (value) => {
  if (Array.isArray(value)) {
    return value.filter((type) => WORKOUT_TYPES.includes(type));
  }

  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(/\s+OR\s+/i)
    .map((type) => type.trim())
    .filter((type) => WORKOUT_TYPES.includes(type));
};

export const formatWorkoutTypes = (types = []) => (
  WORKOUT_TYPES
    .filter((type) => types.includes(type))
    .join(WORKOUT_TYPE_SEPARATOR)
);

export const emptyAthleteActivity = {
  session_type: '',
  duration_minutes: 0,
  mileage: 0,
  shoes: [],
  shoe_mileage: {},
  rpe: null,
  comments: '',
};

export const emptyCoachActivity = {
  workout_type: '',
  planned_difficulty: null,
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

export const sanitizeAthleteActivity = (activity = {}) => ({
  ...activity,
  session_type: activity.session_type || '',
  duration_minutes: Number(activity.duration_minutes) || 0,
  mileage: Number(activity.mileage) || 0,
  shoes: activity.shoes || [],
  shoe_mileage: Object.fromEntries(
    Object.entries(activity.shoe_mileage || {})
      .map(([shoeId, mileage]) => [shoeId, Number(mileage) || 0])
      .filter(([, mileage]) => mileage > 0)
  ),
  rpe: activity.rpe === null || activity.rpe === undefined ? null : Number(activity.rpe),
  comments: activity.comments || '',
});

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
  if (activity.session_type === 'Off') return sum;
  return sum + (Number(activity.mileage) || 0);
}, 0);

export const getSessionDuration = (session = {}) => getAthleteActivities(session).reduce((sum, activity) => {
  if (activity.session_type === 'Off') return sum;
  return sum + (Number(activity.duration_minutes) || 0);
}, 0);

export const hasCoachActivityData = (activity = {}) => (
  Boolean(activity.workout_type) ||
  activity.planned_difficulty !== null && activity.planned_difficulty !== undefined ||
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

export const sanitizeCoachActivity = (activity = {}) => ({
  ...activity,
  workout_type: formatWorkoutTypes(parseWorkoutTypes(activity.workout_type)) || activity.workout_type || '',
  planned_difficulty:
    activity.planned_difficulty === null || activity.planned_difficulty === undefined || activity.planned_difficulty === ''
      ? null
      : Number(activity.planned_difficulty),
  prescription: activity.prescription || '',
  coach_notes: activity.coach_notes || '',
});

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
