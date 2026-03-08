import React from 'react';
import { format, addDays, startOfWeek, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WORKOUT_TYPE_COLORS = {
  'Easy Run': 'bg-sky-100 text-sky-700 border-sky-200',
  'Workout': 'bg-purple-100 text-purple-700 border-purple-200',
  'Long Run': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Strides': 'bg-teal-100 text-teal-700 border-teal-200',
  'X-Train': 'bg-amber-100 text-amber-700 border-amber-200',
  'Lift': 'bg-slate-100 text-slate-600 border-slate-200',
  'Off': 'bg-gray-50 text-gray-400 border-gray-100',
  'Recovery': 'bg-green-100 text-green-700 border-green-200',
  'Tempo': 'bg-orange-100 text-orange-700 border-orange-200',
  'Race': 'bg-red-100 text-red-700 border-red-200',
};

const DIFFICULTY_DOT_COLORS = {
  1: 'bg-emerald-400', 2: 'bg-emerald-500', 3: 'bg-lime-500',
  4: 'bg-yellow-400', 5: 'bg-amber-500', 6: 'bg-orange-500',
  7: 'bg-orange-600', 8: 'bg-red-500', 9: 'bg-red-700',
};

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

function WeekRow({ weekStart, allDayPlans, currentMonth, onWeekClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekMileage = days.reduce((sum, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const plan = allDayPlans[dateStr];
    if (!plan) return sum;
    const amMi = plan.am_session?.session_type === 'Run' ? (plan.am_session?.mileage || 0) : 0;
    const pmMi = plan.pm_session?.session_type === 'Run' ? (plan.pm_session?.mileage || 0) : 0;
    return sum + amMi + pmMi;
  }, 0);

  return (
    <div className="grid grid-cols-8 border-b border-slate-100 last:border-b-0 group">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const plan = allDayPlans[dateStr];
        const inMonth = isSameMonth(day, currentMonth);
        const today = isToday(day);
        const amMileage = plan?.am_session?.session_type === 'Run' ? plan.am_session?.mileage : null;
        const pmMileage = plan?.pm_session?.session_type === 'Run' ? plan.pm_session?.mileage : null;

        return (
          <div
            key={dateStr}
            className={cn(
              'min-h-[90px] p-2 border-r border-slate-100 last:border-r-0',
              !inMonth && 'opacity-30',
              today && 'bg-amber-50',
            )}
          >
            <div className={cn(
              'text-xs font-semibold mb-1',
              today ? 'text-amber-600' : 'text-slate-500'
            )}>
              {format(day, 'd')}
            </div>

            {plan?.workout_type && plan.workout_type !== 'Off' && (
              <div className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded border truncate mb-1',
                WORKOUT_TYPE_COLORS[plan.workout_type] || 'bg-slate-100 text-slate-600'
              )}>
                {plan.workout_type}
              </div>
            )}

            {plan?.planned_difficulty && (
              <div className="flex items-center gap-1 mb-1">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  DIFFICULTY_DOT_COLORS[plan.planned_difficulty]
                )} />
                <span className="text-[10px] text-slate-400">{plan.planned_difficulty}</span>
              </div>
            )}

            {(amMileage || pmMileage) && (
              <div className="text-[10px] text-slate-600 font-medium">
                {amMileage ? `${amMileage} mi` : ''}
                {amMileage && pmMileage ? ' + ' : ''}
                {pmMileage ? `${pmMileage} mi` : ''}
              </div>
            )}

            {plan?.am_session?.rpe && (
              <div className="text-[10px] text-slate-400">RPE {plan.am_session.rpe}</div>
            )}
          </div>
        );
      })}

      {/* Weekly total column */}
      <div
        className="min-h-[90px] p-2 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => onWeekClick(weekStart)}
        title="Open this week"
      >
        {weekMileage > 0 && (
          <div className="text-sm font-bold text-slate-700">{weekMileage.toFixed(1)}</div>
        )}
        <div className="text-[10px] text-slate-400">mi</div>
        <div className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Month Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <Button variant="ghost" size="sm" onClick={goToPrev}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={String(currentMonth.getMonth())}
            onValueChange={(v) => {
              const d = new Date(currentMonth);
              d.setMonth(parseInt(v));
              onMonthChange(d);
            }}
          >
            <SelectTrigger className="w-32 h-8 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(currentMonth.getFullYear())}
            onValueChange={(v) => {
              const d = new Date(currentMonth);
              d.setFullYear(parseInt(v));
              onMonthChange(d);
            }}
          >
            <SelectTrigger className="w-24 h-8 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={goToNext}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
        {dayHeaders.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wide border-r border-slate-100 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
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