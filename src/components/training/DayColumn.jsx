import React from 'react';
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Moon, Pencil, Sun } from "lucide-react";
import { getRpeColorClasses } from "./rpeColors";
import {
  getAthleteActivities,
  getCoachActivities,
  hasAthleteActivityData,
  hasAthleteSessionData,
  hasCoachLiftData,
  hasCoachSessionData,
  neutralWorkoutBadgeClass,
} from "./sessionUtils";

const hasAthleteLift = (lift = {}) => (
  Number(lift.duration_minutes) > 0 ||
  Boolean(lift.lift_type?.trim())
);

const formatNumber = (value) => {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

function RpeChip({ value }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const rpeColors = getRpeColorClasses(value);

  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none", rpeColors.badge)}>
      RPE {value}
    </span>
  );
}

function TypeBadge({ children }) {
  if (!children) return null;

  return (
    <Badge variant="outline" className={cn("text-[10px]", neutralWorkoutBadgeClass)}>
      {children}
    </Badge>
  );
}

export default function DayColumn({ date, dayPlan, onEdit, isCoach, shoes = [] }) {
  const today = isToday(date);
  const dayName = format(date, 'EEE');
  const dayNum = format(date, 'd');

  const getShoeNames = (shoeIds) => {
    if (!shoeIds?.length) return null;
    return shoeIds.map((id) => {
      const shoe = shoes.find((shoeRecord) => shoeRecord.id === id);
      return shoe?.name || 'Unknown';
    }).join(', ');
  };

  const AthleteSessionBlock = ({ session, label, icon: Icon }) => {
    if (!hasAthleteSessionData(session)) return null;

    const activities = getAthleteActivities(session).filter(hasAthleteActivityData);

    return activities.map((activity, index) => {
      const shoeNames = getShoeNames(activity.shoes);
      const mileage = Number(activity.mileage) || 0;
      const minutes = Number(activity.duration_minutes) || 0;

      return (
        <div key={`${label}-${index}`} className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {label}
            </span>
            {activities.length > 1 && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">#{index + 1}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge>{activity.session_type}</TypeBadge>
            <RpeChip value={activity.rpe} />
          </div>

          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            {activity.session_type !== 'Off' && mileage > 0 && (
              <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(mileage)} mi</span>
            )}
            {activity.session_type !== 'Off' && minutes > 0 && (
              <span className="text-slate-600 dark:text-slate-300">{minutes} min</span>
            )}
          </div>

          {shoeNames && (
            <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">
              {shoeNames}
            </div>
          )}
          {activity.comments?.trim() && (
            <p className="line-clamp-2 text-[10px] italic text-slate-500 dark:text-slate-400">{activity.comments.trim()}</p>
          )}
        </div>
      );
    });
  };

  const CoachSessionBlock = ({ session, label, icon: Icon }) => {
    if (!hasCoachSessionData(session)) return null;

    const activities = getCoachActivities(session);

    return activities.map((activity, index) => (
      <div key={`${label}-${index}`} className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </span>
          {activities.length > 1 && (
            <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">#{index + 1}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge>{activity.workout_type}</TypeBadge>
          <RpeChip value={activity.planned_difficulty} />
        </div>

        {activity.prescription?.trim() && (
          <p className="text-[10px] leading-snug text-slate-700 dark:text-slate-300">{activity.prescription.trim()}</p>
        )}
        {activity.coach_notes?.trim() && (
          <p className="border-t border-slate-100 pt-1 text-[10px] italic text-slate-400 dark:border-slate-800 dark:text-slate-500">{activity.coach_notes.trim()}</p>
        )}
      </div>
    ));
  };

  const CoachLiftBlock = ({ lift }) => {
    if (!hasCoachLiftData(lift)) return null;

    return (
      <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Dumbbell className="h-3 w-3" />
          Lift
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge>{lift.lift_type || 'Lift'}</TypeBadge>
          {Number(lift.duration_minutes) > 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-300">{lift.duration_minutes} min</span>
          )}
        </div>
        {lift.prescription?.trim() && (
          <p className="text-[10px] leading-snug text-slate-700 dark:text-slate-300">{lift.prescription.trim()}</p>
        )}
        {lift.coach_notes?.trim() && (
          <p className="border-t border-slate-100 pt-1 text-[10px] italic text-slate-400 dark:border-slate-800 dark:text-slate-500">{lift.coach_notes.trim()}</p>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex min-h-[460px] min-w-[140px] flex-1 flex-col border-r border-slate-300 last:border-r-0 dark:border-slate-700",
      today && "bg-amber-50/30 dark:bg-amber-950/20"
    )}>
      <div className={cn(
        "border-b border-slate-300 py-2 text-center dark:border-slate-700",
        today ? "bg-amber-100 dark:bg-amber-950/50" : "bg-white dark:bg-slate-900"
      )}>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{dayName}</div>
        <div className={cn(
          "text-lg font-bold",
          today ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-slate-100"
        )}>{dayNum}</div>
      </div>

      <div className="flex-1 border-b border-slate-300 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Coach</span>
          {isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'coach')}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <CoachSessionBlock session={dayPlan?.am_coach} label="AM" icon={Sun} />
          <CoachSessionBlock session={dayPlan?.pm_coach} label="PM" icon={Moon} />
          <CoachLiftBlock lift={dayPlan?.lift_coach} />
        </div>
      </div>

      <div className="flex-1 bg-white p-2 dark:bg-slate-950">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Athlete</span>
          {!isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'athlete')}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <AthleteSessionBlock session={dayPlan?.am_session} label="AM" icon={Sun} />
          <AthleteSessionBlock session={dayPlan?.pm_session} label="PM" icon={Moon} />

          {hasAthleteLift(dayPlan?.lift) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Dumbbell className="h-3 w-3" />
                Lift
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                {Number(dayPlan.lift.duration_minutes) > 0 && `${dayPlan.lift.duration_minutes} min`}
                {dayPlan.lift.lift_type?.trim() && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {Number(dayPlan.lift.duration_minutes) > 0 ? ' - ' : ''}
                    {dayPlan.lift.lift_type.trim()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
