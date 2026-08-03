import React from 'react';
import { addDays, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MessageSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRpeColorClasses } from './rpeColors';
import { getTrainingFactorEntries } from './trainingFactors';
import {
  allowsActivityMileage,
  getAthleteActivities,
  getCoachActivities,
  getSessionMileage,
  hasAthleteActivityData,
  hasAthleteSessionData,
  hasCoachSessionData,
  isXTrainType,
  neutralWorkoutBadgeClass,
  XTRAIN_OTHER_TYPE,
} from './sessionUtils';

const MONTH_GRID_TEMPLATE = 'repeat(7, minmax(10rem, 1fr)) minmax(5.75rem, 6.5rem) 15rem';
const MONTH_GRID_MIN_WIDTH = '91.25rem';

const COMPACT_SESSION_TYPES = {
  'Easy Run': 'Easy',
  'Long Run': 'Long',
  'Long Run > Specific LR': 'Specific LR',
  'Long Run > Structured LR': 'Structured LR',
  'Long Run > Regular LR': 'Regular LR',
  'Workout > Hills': 'Hills',
  'Workout > Tempo': 'Tempo',
  'Workout > Tempo Repeats': 'Tempo Reps',
  'Workout > Intervals': 'Intervals',
  'Workout > Fartlek': 'Fartlek',
  'Workout > Track Fartlek': 'Track Fartlek',
  'X-Train': 'XT',
  'X-Train > Elliptical': 'Elliptical',
  'X-Train > Swim': 'Swim',
  'X-Train > Bike': 'Bike',
  'X-Train > Ski': 'Ski',
  [XTRAIN_OTHER_TYPE]: 'Other',
};

const hasLift = (lift = {}) => (
  Number(lift.duration_minutes) > 0 ||
  Boolean(lift.lift_type?.trim())
);

const formatNumber = (value) => {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

const formatMinutes = (minutes) => {
  const normalizedMinutes = Number(minutes) || 0;
  if (normalizedMinutes <= 0) return '0m';
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const compactSessionType = (sessionType = 'Session', xtrainOther = '') => {
  const customXTrainType = String(xtrainOther || '').trim();

  return sessionType
    .split(/\s+OR\s+/i)
    .map((type) => (type === XTRAIN_OTHER_TYPE && customXTrainType
      ? customXTrainType
      : COMPACT_SESSION_TYPES[type] || type))
    .join(' / ');
};

const hasText = (value) => Boolean(String(value || '').trim());

const getWeekStats = (days, allDayPlans) => {
  let mileage = 0;
  let xTrainMinutes = 0;
  let liftCount = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  days.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const plan = allDayPlans[dateStr];
    if (!plan) return;

    mileage += getSessionMileage(plan.am_session) + getSessionMileage(plan.pm_session);

    [plan.am_session, plan.pm_session].forEach((session) => {
      getAthleteActivities(session).forEach((activity) => {
        if (isXTrainType(activity.session_type)) {
          xTrainMinutes += Number(activity.duration_minutes) || 0;
        }
        if (activity.rpe !== null && activity.rpe !== undefined) {
          rpeSum += Number(activity.rpe) || 0;
          rpeCount += 1;
        }
      });
    });

    if (hasLift(plan.lift)) {
      liftCount += 1;
    }
  });

  return {
    mileage,
    xTrainMinutes,
    liftCount,
    avgRpe: rpeCount > 0 ? rpeSum / rpeCount : null,
  };
};

function AthleteActivitySummary({ label, activity, index, total }) {
  const mileage = Number(activity.mileage) || 0;
  const minutes = Number(activity.duration_minutes) || 0;
  const sessionType = activity.session_type || 'Session';
  const metricItems = [];
  const rpeColors = getRpeColorClasses(activity.rpe);

  if (allowsActivityMileage(sessionType) && mileage > 0) {
    metricItems.push(`${formatNumber(mileage)} mi`);
  }

  if (sessionType !== 'Off' && minutes > 0) {
    metricItems.push(formatMinutes(minutes));
  }

  return (
    <div className={cn("rounded-lg border px-2 py-1.5 shadow-sm", rpeColors.surface)}>
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-75">
          {label}{total > 1 ? index + 1 : ''}
        </span>
        <span className={cn(
          'min-w-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
          neutralWorkoutBadgeClass
        )}
          title={sessionType}
        >
          {compactSessionType(sessionType, activity.xtrain_other || '')}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium leading-tight">
        {metricItems.length > 0 && <span>{metricItems.join(' · ')}</span>}
        {activity.rpe !== null && activity.rpe !== undefined && (
          <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold leading-none", rpeColors.badge)}>
            RPE {activity.rpe}
          </span>
        )}
        {activity.strides && (
          <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            Strides
          </span>
        )}
      </div>

      {activity.comments?.trim() && (
        <div className="mt-1 hidden whitespace-pre-wrap text-[9px] italic opacity-80 sm:block">
          {activity.comments.trim()}
        </div>
      )}
    </div>
  );
}

function AthleteSessionSummary({ label, session }) {
  const activities = getAthleteActivities(session).filter(hasAthleteActivityData);

  return activities.map((activity, index) => (
    <AthleteActivitySummary
      key={`${label}-${index}`}
      label={label}
      activity={activity}
      index={index}
      total={activities.length}
    />
  ));
}

function TrainingFactorSummary({ factors }) {
  const entries = getTrainingFactorEntries(factors);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((entry) => (
        <span
          key={entry.key}
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold leading-none text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          title={entry.label}
        >
          {entry.shortLabel}: {entry.value}
        </span>
      ))}
    </div>
  );
}

function CoachActivitySummary({ label, activity, index, total }) {
  const rpeColors = getRpeColorClasses(activity.planned_difficulty);
  const workoutType = activity.workout_type || 'Plan';

  return (
    <div className={cn("rounded-lg border px-2 py-1.5 shadow-sm", rpeColors.surface)}>
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-75">
          {label}{total > 1 ? index + 1 : ''}
        </span>
        <span className={cn('min-w-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none', neutralWorkoutBadgeClass)}>
          {compactSessionType(workoutType, activity.xtrain_other || '')}
        </span>
      </div>
      {activity.planned_difficulty !== null && activity.planned_difficulty !== undefined && (
        <div className="mt-1 text-[10px] font-bold leading-none">RPE {activity.planned_difficulty}</div>
      )}
      {activity.strides && (
        <div className="mt-1 text-[10px] font-bold leading-none">Strides</div>
      )}
      {activity.prescription?.trim() && (
        <div className="mt-1 whitespace-pre-wrap text-[10px] leading-snug">{activity.prescription.trim()}</div>
      )}
      {activity.coach_notes?.trim() && (
        <div className="mt-1 border-t border-current/15 pt-1 whitespace-pre-wrap text-[9px] italic opacity-80">{activity.coach_notes.trim()}</div>
      )}
    </div>
  );
}

function CoachSessionSummary({ label, session }) {
  const activities = getCoachActivities(session);

  return activities.map((activity, index) => (
    <CoachActivitySummary
      key={`${label}-${index}`}
      label={label}
      activity={activity}
      index={index}
      total={activities.length}
    />
  ));
}

function FeedbackPanel({ label, value, tone, compact = false }) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  const toneClasses = {
    athlete: 'border-red-200 bg-red-50/70 text-red-900 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-100',
    coach: 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-100',
  };

  return (
    <div className={cn('rounded-lg border px-3 py-2', toneClasses[tone])}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
        <MessageSquare className="h-3 w-3" />
        {label}
      </div>
      <div className={cn(
        'overflow-y-auto whitespace-pre-wrap text-[11px] leading-snug sm:text-xs',
        compact ? 'max-h-20' : 'max-h-24'
      )}>
        {text}
      </div>
    </div>
  );
}

function WeekFeedbackColumn({ trainingWeek }) {
  const hasAthleteReflection = hasText(trainingWeek?.athlete_reflection);
  const hasCoachFeedback = hasText(trainingWeek?.coach_feedback);

  return (
    <div className="border-l border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 md:sticky md:right-0 md:z-10">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        <MessageSquare className="h-3.5 w-3.5 text-red-600 dark:text-red-300" />
        Feedback
      </div>

      {hasAthleteReflection || hasCoachFeedback ? (
        <div className="space-y-2">
          <FeedbackPanel
            label="Athlete"
            value={trainingWeek?.athlete_reflection}
            tone="athlete"
            compact
          />
          <FeedbackPanel
            label="Coach"
            value={trainingWeek?.coach_feedback}
            tone="coach"
            compact
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
          No feedback
        </div>
      )}
    </div>
  );
}

function WeekRow({ weekStart, trainingWeek, allDayPlans, onWeekClick, onDayClick, selectedDate }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStats = getWeekStats(days, allDayPlans);
  const avgRpeColors = getRpeColorClasses(weekStats.avgRpe ? Math.round(weekStats.avgRpe) : null);
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  return (
    <div
      className="group grid border-b border-slate-200 last:border-b-0 dark:border-slate-800"
      style={{ gridTemplateColumns: MONTH_GRID_TEMPLATE, minWidth: MONTH_GRID_MIN_WIDTH }}
    >
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const plan = allDayPlans[dateStr];
        const today = isToday(day);
        const selected = selectedDateStr === dateStr;
        const coachSessions = [
          ['AM', plan?.am_coach],
          ['PM', plan?.pm_coach],
        ].filter(([, session]) => hasCoachSessionData(session));
        const athleteSessions = [
          ['AM', plan?.am_session],
          ['PM', plan?.pm_session],
        ].filter(([, session]) => hasAthleteSessionData(session));
        const trainingFactorEntries = getTrainingFactorEntries(plan?.training_factors);
        const lift = plan?.lift;

        return (
          <div
            key={dateStr}
            role={onDayClick ? 'button' : undefined}
            tabIndex={onDayClick ? 0 : undefined}
            onClick={() => onDayClick?.({ date: day, dayPlan: plan })}
            onKeyDown={(event) => {
              if (!onDayClick || !['Enter', ' '].includes(event.key)) return;
              event.preventDefault();
              onDayClick({ date: day, dayPlan: plan });
            }}
            className={cn(
              'min-h-[220px] border-r border-slate-200 bg-white p-2 outline-none dark:border-slate-800 dark:bg-slate-950 sm:min-h-[260px] sm:p-2.5',
              onDayClick && 'cursor-pointer transition-colors hover:bg-red-50/60 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-inset dark:hover:bg-red-950/20',
              today && 'bg-amber-50 dark:bg-amber-950/30',
              selected && 'bg-red-50 ring-2 ring-inset ring-red-700 dark:bg-red-950/30 dark:ring-red-400',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className={cn(
                'text-sm font-bold',
                today ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
              )}>
                {format(day, 'd')}
              </div>
              {today && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                  Today
                </span>
              )}
              {onDayClick && !today && (
                <Pencil className={cn(
                  "h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500",
                  selected && "text-red-700 opacity-100 dark:text-red-300"
                )} />
              )}
            </div>

            <div className="space-y-2">
              {coachSessions.length > 0 && (
                <div className="space-y-1.5 rounded-lg bg-slate-100/80 p-1.5 dark:bg-slate-800/80">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-200">Coach</div>
                  {coachSessions.map(([label, session]) => (
                    <CoachSessionSummary key={label} label={label} session={session} />
                  ))}
                </div>
              )}

              {(athleteSessions.length > 0 || trainingFactorEntries.length > 0) && (
                <div className="space-y-1.5 rounded-lg bg-white p-1.5 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-200">Athlete</div>
                  {trainingFactorEntries.length > 0 && (
                    <TrainingFactorSummary factors={plan?.training_factors} />
                  )}
                  {athleteSessions.map(([label, session]) => (
                    <AthleteSessionSummary key={label} label={label} session={session} />
                  ))}
                </div>
              )}

              {hasLift(lift) && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-tight text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <div className="font-semibold">Lift</div>
                  <div>
                    {Number(lift.duration_minutes) > 0 && <span>{formatMinutes(lift.duration_minutes)}</span>}
                    {lift.lift_type?.trim() && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {Number(lift.duration_minutes) > 0 ? ' · ' : ''}
                        {lift.lift_type.trim()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        className="sticky right-0 z-10 flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-1 border-l border-slate-300 bg-slate-100 p-2 text-center transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:min-h-[260px] md:right-60"
        onClick={() => onWeekClick(weekStart)}
        title="Open this week"
      >
        {weekStats.mileage > 0 && (
          <div className="text-base font-extrabold leading-tight text-slate-900 dark:text-slate-100">
            {weekStats.mileage.toFixed(1)}
            <span className="block text-xs font-bold">mi</span>
          </div>
        )}
        {weekStats.avgRpe !== null && (
          <div className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none", avgRpeColors.badge)}>
            RPE {weekStats.avgRpe.toFixed(1)}
          </div>
        )}
        {weekStats.xTrainMinutes > 0 && (
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
            XT {formatMinutes(weekStats.xTrainMinutes)}
          </div>
        )}
        {weekStats.liftCount > 0 && (
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
            Lift {weekStats.liftCount}
          </div>
        )}
        {weekStats.mileage === 0 && weekStats.avgRpe === null && weekStats.xTrainMinutes === 0 && weekStats.liftCount === 0 && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500">No log</div>
        )}
        <div className="mt-1 text-[10px] text-red-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-red-300">
          Open
        </div>
      </div>
      <WeekFeedbackColumn trainingWeek={trainingWeek} />
    </div>
  );
}

export default function MonthView({
  rangeStart,
  rangeWeeks,
  onRangeStartChange,
  onRangeWeeksChange,
  allDayPlans,
  trainingWeeksByStart = {},
  onWeekClick,
  onDayClick,
  selectedDate,
  inlineEditor,
}) {
  const [rangeWeeksDraft, setRangeWeeksDraft] = React.useState(String(rangeWeeks));
  const weeks = Array.from({ length: rangeWeeks }, (_, i) => addDays(rangeStart, i * 7));
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rangeEnd = addDays(rangeStart, (rangeWeeks * 7) - 1);
  const selectedWeekKey = selectedDate ? format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd') : null;

  React.useEffect(() => {
    setRangeWeeksDraft(String(rangeWeeks));
  }, [rangeWeeks]);

  const commitRangeWeeksDraft = () => {
    const parsed = parseInt(rangeWeeksDraft, 10);

    if (!Number.isFinite(parsed)) {
      setRangeWeeksDraft(String(rangeWeeks));
      return;
    }

    const nextRangeWeeks = Math.max(1, Math.min(16, parsed));
    setRangeWeeksDraft(String(nextRangeWeeks));
    onRangeWeeksChange(nextRangeWeeks);
  };

  const goToPrev = () => {
    onRangeStartChange(addDays(rangeStart, rangeWeeks * -7));
  };

  const goToNext = () => {
    onRangeStartChange(addDays(rangeStart, rangeWeeks * 7));
  };

  return (
    <div className="btc-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="order-1 grid gap-2 sm:order-2 sm:flex sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="range-start" className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">Start Week</Label>
            <Input
              id="range-start"
              type="date"
              value={format(rangeStart, 'yyyy-MM-dd')}
              onChange={(event) => {
                const parsed = parseISO(event.target.value);
                onRangeStartChange(startOfWeek(parsed, { weekStartsOn: 1 }));
              }}
              className="h-8 text-sm font-semibold sm:w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="range-weeks" className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">Weeks</Label>
            <Input
              id="range-weeks"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rangeWeeksDraft}
              onChange={(event) => setRangeWeeksDraft(event.target.value.replace(/\D/g, ''))}
              onBlur={commitRangeWeeksDraft}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.currentTarget.blur();
              }}
              className="h-8 text-sm font-semibold sm:w-24"
            />
          </div>
          <div className="pb-1 text-xs font-medium text-slate-600 dark:text-slate-200">
            {format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d, yyyy')}
          </div>
        </div>

        <div className="order-2 grid grid-cols-2 gap-2 sm:contents">
          <Button variant="ghost" size="sm" className="justify-center sm:order-1" onClick={goToPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>

          <Button variant="ghost" size="sm" className="justify-center sm:order-3" onClick={goToNext}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div
          className="grid border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
          style={{ gridTemplateColumns: MONTH_GRID_TEMPLATE, minWidth: MONTH_GRID_MIN_WIDTH }}
        >
          {dayHeaders.map((dayHeader) => (
            <div key={dayHeader} className="border-r border-slate-200 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {dayHeader}
            </div>
          ))}
          <div className="sticky right-0 z-20 border-l border-slate-300 bg-slate-200 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 md:right-60">
            Total
          </div>
          <div className="border-l border-slate-300 bg-slate-200 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 md:sticky md:right-0 md:z-20">
            Feedback
          </div>
        </div>

        {weeks.map((weekStart) => {
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          const showInlineEditor = inlineEditor && selectedWeekKey === weekKey;
          const trainingWeek = trainingWeeksByStart[weekKey];

          return (
            <React.Fragment key={weekKey}>
              {showInlineEditor && (
                <div
                  className="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/75"
                  style={{ minWidth: MONTH_GRID_MIN_WIDTH }}
                >
                  <div className="sticky left-0 mx-auto w-[min(calc(100vw-2rem),82rem)] max-w-full p-3 sm:p-4">
                    {inlineEditor}
                  </div>
                </div>
              )}
              <WeekRow
                weekStart={weekStart}
                trainingWeek={trainingWeek}
                allDayPlans={allDayPlans}
                onWeekClick={onWeekClick}
                onDayClick={onDayClick}
                selectedDate={selectedDate}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
