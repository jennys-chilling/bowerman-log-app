import React from 'react';
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Moon, Pencil, Sun } from "lucide-react";
import { getRpeColorClasses } from "./rpeColors";
import { getTrainingFactorEntries } from "./trainingFactors";
import {
  allowsActivityMileage,
  countsAsRunMileage,
  displayWorkoutTypes,
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
  const trainingFactorEntries = getTrainingFactorEntries(dayPlan?.training_factors);

  const getShoeNames = (activity) => {
    const shoeIds = activity?.shoes || [];
    if (!shoeIds?.length) return null;
    return shoeIds.map((id) => {
      const shoe = shoes.find((shoeRecord) => shoeRecord.id === id);
      const splitMileage = Number(activity.shoe_mileage?.[id]) || 0;
      return splitMileage > 0 ? `${shoe?.name || 'Unknown'} ${formatNumber(splitMileage)} mi` : shoe?.name || 'Unknown';
    }).join(', ');
  };

  const AthleteSessionBlock = ({ session, label, icon: Icon }) => {
    if (!hasAthleteSessionData(session)) return null;

    const activities = getAthleteActivities(session).filter(hasAthleteActivityData);

    return activities.map((activity, index) => {
      const shoeNames = countsAsRunMileage(activity.session_type) ? getShoeNames(activity) : null;
      const mileage = Number(activity.mileage) || 0;
      const minutes = Number(activity.duration_minutes) || 0;
      const rpeColors = getRpeColorClasses(activity.rpe);

      return (
        <div key={`${label}-${index}`} className={cn("space-y-1 rounded-lg border p-1.5 shadow-sm sm:p-2", rpeColors.surface)}>
          <div className="flex items-center justify-between gap-2 text-xs opacity-75">
            <span className="flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {label}
            </span>
            {activities.length > 1 && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">#{index + 1}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge>{displayWorkoutTypes(activity.session_type, activity.xtrain_other)}</TypeBadge>
            {activity.strides && <TypeBadge>Strides</TypeBadge>}
            <RpeChip value={activity.rpe} />
          </div>

          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            {allowsActivityMileage(activity.session_type) && mileage > 0 && (
              <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(mileage)} mi</span>
            )}
            {activity.session_type !== 'Off' && minutes > 0 && (
              <span className="text-slate-600 dark:text-slate-300">{minutes} min</span>
            )}
          </div>

          {shoeNames && (
            <div className="text-[10px] opacity-75">
              {shoeNames}
            </div>
          )}
          {activity.comments?.trim() && (
            <p className="whitespace-pre-wrap text-[10px] italic opacity-80">{activity.comments.trim()}</p>
          )}
        </div>
      );
    });
  };

  const CoachSessionBlock = ({ session, label, icon: Icon }) => {
    if (!hasCoachSessionData(session)) return null;

    const activities = getCoachActivities(session);

    return activities.map((activity, index) => {
      const rpeColors = getRpeColorClasses(activity.planned_difficulty);

      return (
      <div key={`${label}-${index}`} className={cn("space-y-1 rounded-lg border p-1.5 shadow-sm sm:p-2", rpeColors.surface)}>
        <div className="flex items-center justify-between gap-2 text-xs opacity-75">
          <span className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </span>
          {activities.length > 1 && (
            <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">#{index + 1}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge>{displayWorkoutTypes(activity.workout_type, activity.xtrain_other)}</TypeBadge>
          {activity.strides && <TypeBadge>Strides</TypeBadge>}
          <RpeChip value={activity.planned_difficulty} />
        </div>

        {activity.prescription?.trim() && (
          <p className="whitespace-pre-wrap text-[10px] leading-snug">{activity.prescription.trim()}</p>
        )}
        {activity.coach_notes?.trim() && (
          <p className="border-t border-current/15 pt-1 whitespace-pre-wrap text-[10px] italic opacity-80">{activity.coach_notes.trim()}</p>
        )}
      </div>
      );
    });
  };

  const CoachLiftBlock = ({ lift }) => {
    if (!hasCoachLiftData(lift)) return null;

    return (
      <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-2">
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

  const TrainingFactorsBlock = () => {
    if (trainingFactorEntries.length === 0) return null;

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-2">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Factors
        </div>
        <div className="flex flex-wrap gap-1">
          {trainingFactorEntries.map((entry) => (
            <span
              key={entry.key}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {entry.shortLabel}: {entry.value}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "flex min-h-[360px] min-w-[108px] flex-1 flex-col border-r border-slate-300 last:border-r-0 dark:border-slate-700 sm:min-h-[420px] sm:min-w-[128px] lg:min-h-[460px] lg:min-w-[140px]",
      today && "bg-amber-50/30 dark:bg-amber-950/20"
    )}>
      <div className={cn(
        "border-b border-slate-300 py-1.5 text-center dark:border-slate-700 sm:py-2",
        today ? "bg-amber-100 dark:bg-amber-950/50" : "bg-white dark:bg-slate-900"
      )}>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{dayName}</div>
        <div className={cn(
          "text-base font-bold sm:text-lg",
          today ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-slate-100"
        )}>{dayNum}</div>
      </div>

      <div className="flex-1 border-b border-slate-300 bg-slate-100 p-1.5 dark:border-slate-700 dark:bg-slate-900 sm:p-2">
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Coach</span>
          {isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'coach', date)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <CoachSessionBlock session={dayPlan?.am_coach} label="AM" icon={Sun} />
          <CoachSessionBlock session={dayPlan?.pm_coach} label="PM" icon={Moon} />
          <CoachLiftBlock lift={dayPlan?.lift_coach} />
        </div>
      </div>

      <div className="flex-1 bg-white p-1.5 dark:bg-slate-950 sm:p-2">
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Athlete</span>
          {!isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'athlete', date)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <TrainingFactorsBlock />
          <AthleteSessionBlock session={dayPlan?.am_session} label="AM" icon={Sun} />
          <AthleteSessionBlock session={dayPlan?.pm_session} label="PM" icon={Moon} />

          {hasAthleteLift(dayPlan?.lift) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-2">
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
