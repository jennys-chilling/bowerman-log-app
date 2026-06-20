import React from 'react';
import { addDays, format, isSameMonth, isToday, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRpeColorClasses } from './rpeColors';
import {
  getAthleteActivities,
  getSessionMileage,
  hasAthleteActivityData,
  hasAthleteSessionData,
  neutralWorkoutBadgeClass,
} from './sessionUtils';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

function getWeeksInMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const weeks = [];
  let current = firstWeekStart;
  while (current <= lastDay) {
    weeks.push(current);
    current = addDays(current, 7);
  }
  return weeks;
}

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
        if (activity.session_type === 'X-Train') {
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
  const rpeColors = getRpeColorClasses(activity.rpe);

  return (
    <div className="rounded-md border border-slate-200 bg-white px-1.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 text-[9px] font-semibold uppercase text-slate-400 dark:text-slate-500">
          {label}{total > 1 ? index + 1 : ''}
        </span>
        <span className={cn(
          'min-w-0 truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none',
          neutralWorkoutBadgeClass
        )}>
          {sessionType}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
        {sessionType !== 'Off' && mileage > 0 && <span>{formatNumber(mileage)} mi</span>}
        {sessionType !== 'Off' && minutes > 0 && <span>{minutes} min</span>}
        {activity.rpe !== null && activity.rpe !== undefined && (
          <span className={cn("rounded border px-1 py-0.5 text-[9px] font-bold leading-none", rpeColors.badge)}>
            RPE {activity.rpe}
          </span>
        )}
      </div>

      {activity.comments?.trim() && (
        <div className="mt-0.5 truncate text-[9px] italic text-slate-400 dark:text-slate-500">
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

function WeekRow({ weekStart, allDayPlans, currentMonth, onWeekClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStats = getWeekStats(days, allDayPlans);
  const avgRpeColors = getRpeColorClasses(weekStats.avgRpe ? Math.round(weekStats.avgRpe) : null);

  return (
    <div className="group grid grid-cols-8 border-b border-slate-100 last:border-b-0 dark:border-slate-800">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const plan = allDayPlans[dateStr];
        const inMonth = isSameMonth(day, currentMonth);
        const today = isToday(day);
        const athleteSessions = [
          ['AM', plan?.am_session],
          ['PM', plan?.pm_session],
        ].filter(([, session]) => hasAthleteSessionData(session));
        const lift = plan?.lift;

        return (
          <div
            key={dateStr}
            className={cn(
              'min-h-[118px] border-r border-slate-100 p-2 last:border-r-0 dark:border-slate-800',
              !inMonth && 'opacity-30',
              today && 'bg-amber-50 dark:bg-amber-950/30',
            )}
          >
            <div className={cn(
              'mb-1 text-xs font-semibold',
              today ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
            )}>
              {format(day, 'd')}
            </div>

            <div className="space-y-1">
              {athleteSessions.map(([label, session]) => (
                <AthleteSessionSummary key={label} label={label} session={session} />
              ))}

              {hasLift(lift) && (
                <div className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-1 text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <span className="font-semibold">Lift</span>
                  {Number(lift.duration_minutes) > 0 && <span> {lift.duration_minutes} min</span>}
                  {lift.lift_type?.trim() && <span className="text-slate-400 dark:text-slate-500"> - {lift.lift_type.trim()}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center gap-1 bg-slate-50 p-2 text-center transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
        onClick={() => onWeekClick(weekStart)}
        title="Open this week"
      >
        {weekStats.mileage > 0 && (
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{weekStats.mileage.toFixed(1)} mi</div>
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
    </div>
  );
}

export default function MonthView({ currentMonth, onMonthChange, allDayPlans, onWeekClick }) {
  const weeks = getWeeksInMonth(currentMonth);
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total'];

  const goToPrev = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };

  const goToNext = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Button variant="ghost" size="sm" onClick={goToPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Prev
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={String(currentMonth.getMonth())}
            onValueChange={(value) => {
              const d = new Date(currentMonth);
              d.setMonth(parseInt(value, 10));
              onMonthChange(d);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index)}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(currentMonth.getFullYear())}
            onValueChange={(value) => {
              const d = new Date(currentMonth);
              d.setFullYear(parseInt(value, 10));
              onMonthChange(d);
            }}
          >
            <SelectTrigger className="h-8 w-24 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={goToNext}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        {dayHeaders.map((dayHeader) => (
          <div key={dayHeader} className="border-r border-slate-100 py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400">
            {dayHeader}
          </div>
        ))}
      </div>

      {weeks.map((weekStart) => (
        <WeekRow
          key={format(weekStart, 'yyyy-MM-dd')}
          weekStart={weekStart}
          allDayPlans={allDayPlans}
          currentMonth={currentMonth}
          onWeekClick={onWeekClick}
        />
      ))}
    </div>
  );
}
