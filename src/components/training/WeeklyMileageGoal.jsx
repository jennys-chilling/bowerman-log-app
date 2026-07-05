import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronDown, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import { getSessionMileage } from "./sessionUtils";

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

const getMilesLeftLabel = ({ goalMin, goalMax }, currentMileage) => {
  if (goalMin === null && goalMax === null) return '-';

  if (goalMax !== null && goalMin !== null && goalMax !== goalMin) {
    const lowerLeft = Math.max(0, goalMin - currentMileage);
    const upperLeft = Math.max(0, goalMax - currentMileage);

    if (upperLeft === 0) return '0 mi';
    if (lowerLeft === upperLeft) return `${formatMileage(upperLeft)} mi`;
    return `${formatMileage(lowerLeft)}-${formatMileage(upperLeft)} mi`;
  }

  const target = goalMin ?? goalMax;
  return `${formatMileage(target - currentMileage)} mi`;
};

export default function WeeklyMileageGoal({ trainingWeek, isCoach, onSave, dayPlans = [] }) {
  const [isOpen, setIsOpen] = usePersistentBoolean('btc.weeklyMileageGoal.open', true);
  const [goalText, setGoalText] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setGoalText(formatGoalText(trainingWeek?.goal_mileage_min, trainingWeek?.goal_mileage_max));
    setHasUserEdited(false);
  }, [trainingWeek?.id, trainingWeek?.goal_mileage_min, trainingWeek?.goal_mileage_max]);

  const parsedGoal = useMemo(() => parseGoalText(goalText), [goalText]);
  const currentMileage = useMemo(() => getCurrentMileage(dayPlans), [dayPlans]);
  const milesLeft = getMilesLeftLabel(parsedGoal, currentMileage);
  const hasGoal = parsedGoal.goalMin !== null || parsedGoal.goalMax !== null;

  useEffect(() => {
    if (!isCoach || !trainingWeek?.id || !hasUserEdited || !parsedGoal.isValid) {
      return undefined;
    }

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onSave({
        goal_mileage_min: parsedGoal.goalMin,
        goal_mileage_max: parsedGoal.goalMax,
      });
    }, 700);

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
        "flex w-full flex-col rounded-xl border border-slate-300 bg-white p-3 shadow-md dark:border-slate-700 dark:bg-slate-950 sm:p-4",
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
              {milesLeft} left
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
                setHasUserEdited(true);
              }}
            />
            {!parsedGoal.isValid && (
              <div className="text-xs text-red-700 dark:text-red-300">Add a mileage number or range.</div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            {formatGoalText(parsedGoal.goalMin, parsedGoal.goalMax)}
          </div>
        )}

        <div className="mt-3 grid flex-1 gap-2 sm:mt-4 sm:content-end sm:gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900 sm:p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Miles Left</div>
            <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-1 sm:text-2xl">{milesLeft}</div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatMileage(currentMileage)} mi logged this week
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
