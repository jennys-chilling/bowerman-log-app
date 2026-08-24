import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronDown, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import { getSessionMileage } from "./sessionUtils";

const AUTOSAVE_DELAY_MS = 1800;

const formatGoalValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

const formatMileage = (value) => {
  const number = Math.max(0, Number(value) || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

const formatGoalText = (min, max) => {
  const minText = formatGoalValue(min);
  const maxText = formatGoalValue(max);

  if (minText && maxText) return `${minText}-${maxText} mi`;
  if (minText) return `${minText} mi`;
  if (maxText) return `${maxText} mi`;
  return '';
};

const parseGoalText = (value) => {
  const text = value.trim();
  const matches = text.match(/\d+(?:\.\d+)?/g) || [];
  const numbers = matches
    .map((match) => Number(match))
    .filter((number) => Number.isFinite(number));

  if (numbers.length === 0) {
    return {
      goalMin: null,
      goalMax: null,
      isValid: text.length === 0,
    };
  }

  if (numbers.length === 1) {
    return {
      goalMin: numbers[0],
      goalMax: null,
      isValid: true,
    };
  }

  return {
    goalMin: Math.min(numbers[0], numbers[1]),
    goalMax: Math.max(numbers[0], numbers[1]),
    isValid: true,
  };
};

const getCurrentMileage = (dayPlans = []) => dayPlans.reduce((sum, dayPlan) => (
  sum + getSessionMileage(dayPlan.am_session) + getSessionMileage(dayPlan.pm_session)
), 0);

const getMilesLeftStatus = ({ goalMin, goalMax }, currentMileage) => {
  if (goalMin === null && goalMax === null) {
    return { badge: '-', detail: '-', detailLabel: 'Miles Left' };
  }

  if (goalMax !== null && goalMin !== null && goalMax !== goalMin) {
    if (currentMileage < goalMin) {
      const underMin = goalMin - currentMileage;
      return {
        badge: `${formatMileage(underMin)} to min`,
        detail: `${formatMileage(underMin)} mi`,
        detailLabel: 'To Goal Min',
      };
    }

    if (currentMileage > goalMax) {
      const overMax = currentMileage - goalMax;
      return {
        badge: `${formatMileage(overMax)} over`,
        detail: `${formatMileage(overMax)} mi`,
        detailLabel: 'Over Goal Max',
      };
    }

    const toMax = goalMax - currentMileage;
    return {
      badge: toMax === 0 ? 'At max' : 'In range',
      detail: toMax === 0 ? '0 mi' : `${formatMileage(toMax)} mi`,
      detailLabel: toMax === 0 ? 'At Goal Max' : 'Room To Max',
    };
  }

  const target = goalMin ?? goalMax;
  const remaining = target - currentMileage;

  if (remaining > 0) {
    return {
      badge: `${formatMileage(remaining)} left`,
      detail: `${formatMileage(remaining)} mi`,
      detailLabel: 'Miles Left',
    };
  }

  if (remaining < 0) {
    return {
      badge: `${formatMileage(Math.abs(remaining))} over`,
      detail: `${formatMileage(Math.abs(remaining))} mi`,
      detailLabel: 'Over Goal',
    };
  }

  return {
    badge: 'On goal',
    detail: '0 mi',
    detailLabel: 'Miles Left',
  };
};

export default function WeeklyMileageGoal({ trainingWeek, isCoach, onSave, dayPlans = [] }) {
  const [isOpen, setIsOpen] = usePersistentBoolean('btc.weeklyMileageGoal.open', true);
  const [goalText, setGoalText] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const saveTimer = useRef(null);
  const editVersionRef = useRef(0);
  const hasUserEditedRef = useRef(false);
  const loadedWeekKeyRef = useRef(null);

  const markEdited = () => {
    editVersionRef.current += 1;
    hasUserEditedRef.current = true;
    setHasUserEdited(true);
  };

  const markClean = () => {
    hasUserEditedRef.current = false;
    setHasUserEdited(false);
  };

  useEffect(() => {
    const nextWeekKey = trainingWeek?.id || 'none';
    const isNewWeek = loadedWeekKeyRef.current !== nextWeekKey;

    if (hasUserEditedRef.current && !isNewWeek) {
      return;
    }

    setGoalText(formatGoalText(trainingWeek?.goal_mileage_min, trainingWeek?.goal_mileage_max));
    loadedWeekKeyRef.current = nextWeekKey;
    editVersionRef.current = 0;
    markClean();
  }, [trainingWeek?.id, trainingWeek?.goal_mileage_min, trainingWeek?.goal_mileage_max]);

  const parsedGoal = useMemo(() => parseGoalText(goalText), [goalText]);
  const currentMileage = useMemo(() => getCurrentMileage(dayPlans), [dayPlans]);
  const milesLeftStatus = getMilesLeftStatus(parsedGoal, currentMileage);
  const hasGoal = parsedGoal.goalMin !== null || parsedGoal.goalMax !== null;

  useEffect(() => {
    if (!isCoach || !trainingWeek?.id || !hasUserEdited || !parsedGoal.isValid) {
      return undefined;
    }

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const versionAtSave = editVersionRef.current;
      const payload = {
        goal_mileage_min: parsedGoal.goalMin,
        goal_mileage_max: parsedGoal.goalMax,
      };

      Promise.resolve(onSave(payload))
        .then(() => {
          if (editVersionRef.current === versionAtSave) {
            markClean();
          }
        })
        .catch(() => {});
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(saveTimer.current);
  }, [hasUserEdited, isCoach, onSave, parsedGoal, trainingWeek?.id]);

  if (!isCoach && !hasGoal) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "btc-panel flex w-full flex-col p-3 sm:p-4",
        isOpen ? "h-full self-stretch sm:min-h-[168px]" : "self-start"
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-label={isOpen ? 'Collapse mileage goal' : 'Expand mileage goal'}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 sm:text-sm">
            <Target className="h-4 w-4 text-red-600" />
            Mileage Goal
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {milesLeftStatus.badge}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-slate-500 transition-transform dark:text-slate-400",
              isOpen && "rotate-180"
            )} />
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 sm:pt-4">
        {isCoach ? (
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs">Goal or range</Label>
            <Input
              className="h-9 sm:h-10"
              value={goalText}
              onChange={(event) => {
                setGoalText(event.target.value);
                markEdited();
              }}
            />
            {!parsedGoal.isValid && (
              <div className="text-xs text-red-700 dark:text-red-300">Add a mileage number or range.</div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {formatGoalText(parsedGoal.goalMin, parsedGoal.goalMax)}
          </div>
        )}

        <div className="mt-3 grid flex-1 gap-2 sm:mt-4 sm:content-end sm:gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800 sm:p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{milesLeftStatus.detailLabel}</div>
            <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-1 sm:text-2xl">{milesLeftStatus.detail}</div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatMileage(currentMileage)} mi logged this week
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
