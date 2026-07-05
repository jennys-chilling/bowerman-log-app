import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkoutTypePicker from "./WorkoutTypePicker";
import { format } from "date-fns";
import { Dumbbell, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { getRpeColorClasses } from "./rpeColors";
import { cn } from "@/lib/utils";
import {
  canHaveStrides,
  emptyCoachActivity,
  emptyCoachLift,
  getCoachActivities,
  hasCoachActivityData,
  hasCoachLiftData,
  makeCoachSession,
  sanitizeCoachLift,
} from "./sessionUtils";

const createCoachActivity = () => ({ ...emptyCoachActivity });

const buildPayload = (formData, dayPlan) => {
  const liftCoach = sanitizeCoachLift(formData.lift_coach);
  const payload = {
    am_coach: makeCoachSession(formData.am_coach),
    pm_coach: makeCoachSession(formData.pm_coach),
  };

  if (hasCoachLiftData(liftCoach) || hasCoachLiftData(dayPlan?.lift_coach)) {
    payload.lift_coach = liftCoach;
  }

  return payload;
};

function ActivityForm({ activity, index, canRemove, onChange, onRemove, compact = false }) {
  const rpeColors = getRpeColorClasses(activity.planned_difficulty);
  const rpeValue = activity.planned_difficulty ?? 5;
  const showStrides = canHaveStrides(activity.workout_type);
  const fieldSpacing = compact ? "space-y-1" : "space-y-2";

  const workoutTypeField = (
    <div className={fieldSpacing}>
      <Label className={cn(compact && "text-xs")}>Workout Type</Label>
      <WorkoutTypePicker
        value={activity.workout_type}
        onChange={(value) => onChange('workout_type', value)}
        triggerClassName={compact ? "h-9" : undefined}
      />
      {!compact && (
        <div className="text-xs text-slate-500 dark:text-slate-400">Select multiple options to show them as OR.</div>
      )}
    </div>
  );

  const stridesControl = showStrides ? (
    <label className={cn(
      "flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      compact ? "px-2.5 py-1 text-xs" : "px-3 py-2"
    )}>
      <Checkbox
        checked={Boolean(activity.strides)}
        onCheckedChange={(checked) => onChange('strides', Boolean(checked))}
      />
      Add strides
    </label>
  ) : null;

  const rpeField = (
    <div className={cn(
      compact
        ? "rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70"
        : fieldSpacing
    )}>
      <div className="flex items-center justify-between gap-2">
        <Label className={cn(compact && "text-xs")}>Goal RPE</Label>
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", rpeColors.badge)}>
          {activity.planned_difficulty ? `RPE ${activity.planned_difficulty}` : 'Not set'}
        </span>
      </div>
      <div className={cn(compact ? "mt-2 flex items-center gap-3" : "space-y-2")}>
        <Slider
          value={[rpeValue]}
          onValueChange={([value]) => onChange('planned_difficulty', value)}
          min={1}
          max={10}
          step={1}
          className={compact ? "min-w-0 flex-1" : undefined}
          trackClassName={rpeColors.track}
          rangeClassName={rpeColors.range}
          thumbClassName={rpeColors.thumb}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 shrink-0 px-2 text-xs", compact && "h-6")}
          onClick={() => onChange('planned_difficulty', null)}
        >
          Clear
        </Button>
      </div>
    </div>
  );

  const prescriptionField = (
    <div className={fieldSpacing}>
      <Label className={cn(compact && "text-xs")}>Prescription</Label>
      <Textarea
        value={activity.prescription || ''}
        onChange={(event) => onChange('prescription', event.target.value)}
        placeholder="e.g., 2 mi WU, 6x1000m @ 5K pace w/ 90s rest, 2 mi CD"
        rows={compact ? 2 : 4}
        className={compact ? "min-h-[4rem] resize-y" : undefined}
      />
    </div>
  );

  const coachNotesField = (
    <div className={fieldSpacing}>
      <Label className={cn(compact && "text-xs")}>Coach Notes</Label>
      <Textarea
        value={activity.coach_notes || ''}
        onChange={(event) => onChange('coach_notes', event.target.value)}
        placeholder="Additional instructions..."
        rows={compact ? 2 : 2}
        className={compact ? "min-h-[4rem] resize-y" : undefined}
      />
    </div>
  );

  return (
    <div className={cn(
      "rounded-lg border border-slate-200 dark:border-slate-800",
      compact ? "space-y-2 p-2.5" : "space-y-4 p-3"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className={cn("font-semibold text-slate-700 dark:text-slate-200", compact ? "text-xs uppercase tracking-wide" : "text-sm")}>Activity {index + 1}</div>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className={cn(compact ? "h-7 w-7" : "h-8 w-8")} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {compact ? (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(12rem,0.85fr)_minmax(17rem,1.3fr)_minmax(14rem,1fr)] xl:grid-cols-[minmax(11rem,0.75fr)_minmax(16rem,1.15fr)_minmax(13rem,0.9fr)_minmax(13rem,0.85fr)]">
            <div className="space-y-2">
              {workoutTypeField}
              {stridesControl}
            </div>
            {prescriptionField}
            {coachNotesField}
            <div className="lg:col-span-3 xl:col-span-1">
              {rpeField}
            </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {workoutTypeField}
            {rpeField}
          </div>
          {stridesControl}
          {prescriptionField}
          {coachNotesField}
        </>
      )}
    </div>
  );
}

function ActivitiesForm({ activities, onChange, onDeleteActivity, compact = false }) {
  const updateActivity = (index, field, value) => {
    onChange(activities.map((activity, activityIndex) => (
      activityIndex === index
        ? {
            ...activity,
            [field]: value,
            ...(field === 'workout_type' && !canHaveStrides(value) ? { strides: false } : {}),
          }
        : activity
    )));
  };

  const addActivity = () => onChange([...activities, createCoachActivity()]);
  const removeActivity = (index) => {
    const nextActivities = activities.filter((_, activityIndex) => activityIndex !== index);
    onDeleteActivity(nextActivities, activities[index]);
  };

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      {activities.map((activity, index) => (
        <ActivityForm
          key={index}
          activity={activity}
          index={index}
          canRemove={activities.length > 1 || hasCoachActivityData(activity)}
          onChange={(field, value) => updateActivity(index, field, value)}
          onRemove={() => removeActivity(index)}
          compact={compact}
        />
      ))}

      <Button type="button" variant="outline" className={cn("w-full", compact && "h-7 text-xs")} onClick={addActivity}>
        <Plus className="mr-2 h-4 w-4" />
        Add Activity
      </Button>
    </div>
  );
}

export default function CoachPlanEditor({ open, onClose, dayPlan, date, onSave, onAutoSave, variant = 'dialog', className }) {
  const compact = variant === 'panel';
  const [formData, setFormData] = useState({
    am_coach: [createCoachActivity()],
    pm_coach: [createCoachActivity()],
    lift_coach: { ...emptyCoachLift },
  });
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    setFormData({
      am_coach: getCoachActivities(dayPlan?.am_coach).length ? getCoachActivities(dayPlan.am_coach) : [createCoachActivity()],
      pm_coach: getCoachActivities(dayPlan?.pm_coach).length ? getCoachActivities(dayPlan.pm_coach) : [createCoachActivity()],
      lift_coach: { ...emptyCoachLift, ...(dayPlan?.lift_coach || {}) },
    });
    setHasUserEdited(false);
  }, [dayPlan, open]);

  useEffect(() => {
    if (!open || !hasUserEdited || !onAutoSave) {
      return undefined;
    }

    window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      onAutoSave(buildPayload(formData, dayPlan));
    }, 900);

    return () => window.clearTimeout(autoSaveTimer.current);
  }, [dayPlan, formData, hasUserEdited, onAutoSave, open]);

  const updateActivities = (sessionKey, activities) => {
    setHasUserEdited(true);
    setFormData((current) => ({ ...current, [sessionKey]: activities }));
  };

  const commitDeletedEntry = async (nextFormData) => {
    window.clearTimeout(autoSaveTimer.current);
    setFormData(nextFormData);
    setHasUserEdited(false);

    if (onAutoSave) {
      await onAutoSave(buildPayload(nextFormData, dayPlan));
    } else {
      await onSave(buildPayload(nextFormData, dayPlan));
    }
  };

  const deleteActivity = (sessionKey, nextActivities, removedActivity) => {
    const shouldPersistImmediately = hasCoachActivityData(removedActivity);
    const normalizedActivities = nextActivities.length > 0 ? nextActivities : [createCoachActivity()];
    const nextFormData = { ...formData, [sessionKey]: normalizedActivities };

    if (!shouldPersistImmediately) {
      updateActivities(sessionKey, normalizedActivities);
      return;
    }

    void commitDeletedEntry(nextFormData);
  };

  const updateLift = (updates) => {
    setHasUserEdited(true);
    setFormData((current) => ({
      ...current,
      lift_coach: { ...current.lift_coach, ...updates },
    }));
  };

  const deleteLift = () => {
    if (!hasCoachLiftData(formData.lift_coach)) {
      return;
    }

    void commitDeletedEntry({ ...formData, lift_coach: { ...emptyCoachLift } });
  };

  const handleSave = () => {
    window.clearTimeout(autoSaveTimer.current);
    onSave(buildPayload(formData, dayPlan));
  };

  if (!open) {
    return null;
  }

  const TitleComponent = variant === 'dialog' ? DialogTitle : 'h2';

  const editorContent = (
    <>
      <DialogHeader className={cn(compact && "space-y-1 border-b border-slate-200 pb-2 dark:border-slate-800")}>
        <TitleComponent className={cn(
          "flex items-center gap-2 font-semibold leading-none tracking-tight",
          compact ? "text-base" : "text-lg"
        )}>
          <span className="text-slate-400 text-sm">Coach Plan:</span>
          {date && format(date, 'EEEE, MMM d')}
        </TitleComponent>
      </DialogHeader>

      <Tabs defaultValue="am" className={cn(compact ? "py-2" : "py-2")}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="am" className="text-xs">
            <Sun className="w-3 h-3 mr-1" /> AM
          </TabsTrigger>
          <TabsTrigger value="pm" className="text-xs">
            <Moon className="w-3 h-3 mr-1" /> PM
          </TabsTrigger>
          <TabsTrigger value="lift" className="text-xs">
            <Dumbbell className="w-3 h-3 mr-1" /> Lift
          </TabsTrigger>
        </TabsList>

        <TabsContent value="am" className={cn(compact ? "mt-2" : "mt-4")}>
          <ActivitiesForm
            activities={formData.am_coach}
            onChange={(activities) => updateActivities('am_coach', activities)}
            onDeleteActivity={(activities, removedActivity) => deleteActivity('am_coach', activities, removedActivity)}
            compact={compact}
          />
        </TabsContent>

        <TabsContent value="pm" className={cn(compact ? "mt-2" : "mt-4")}>
          <ActivitiesForm
            activities={formData.pm_coach}
            onChange={(activities) => updateActivities('pm_coach', activities)}
            onDeleteActivity={(activities, removedActivity) => deleteActivity('pm_coach', activities, removedActivity)}
            compact={compact}
          />
        </TabsContent>

        <TabsContent value="lift" className={cn(compact ? "mt-2" : "mt-4")}>
          <div className={cn(
            "rounded-lg border border-slate-200 dark:border-slate-800",
            compact ? "space-y-3 p-2.5" : "space-y-4 p-3"
          )}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                <Dumbbell className="h-4 w-4" />
                Lift Plan
              </div>
              {hasCoachLiftData(formData.lift_coach) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300"
                  onClick={deleteLift}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className={cn("grid sm:grid-cols-2", compact ? "gap-3" : "gap-4")}>
              <div className={cn(compact ? "space-y-1" : "space-y-2")}>
                <Label className={cn(compact && "text-xs")}>Lift Type</Label>
                <Input
                  value={formData.lift_coach.lift_type || ''}
                  onChange={(event) => updateLift({ lift_type: event.target.value })}
                  placeholder="e.g., Core, lower body, mobility"
                />
              </div>
              <div className={cn(compact ? "space-y-1" : "space-y-2")}>
                <Label className={cn(compact && "text-xs")}>Duration (min)</Label>
                <Input
                  type="number"
                  value={formData.lift_coach.duration_minutes || ''}
                  onChange={(event) => updateLift({ duration_minutes: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div className={cn(compact ? "space-y-1" : "space-y-2")}>
              <Label className={cn(compact && "text-xs")}>Lift Prescription</Label>
              <Textarea
                value={formData.lift_coach.prescription || ''}
                onChange={(event) => updateLift({ prescription: event.target.value })}
                placeholder="e.g., 3 rounds core, calf raises, hip stability"
                rows={compact ? 2 : 4}
                className={compact ? "min-h-[4.5rem]" : undefined}
              />
            </div>

            <div className={cn(compact ? "space-y-1" : "space-y-2")}>
              <Label className={cn(compact && "text-xs")}>Coach Notes</Label>
              <Textarea
                value={formData.lift_coach.coach_notes || ''}
                onChange={(event) => updateLift({ coach_notes: event.target.value })}
                placeholder="Additional lift notes..."
                rows={compact ? 1 : 2}
                className={compact ? "min-h-[2.75rem]" : undefined}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className={cn(
        compact && "sticky bottom-0 -mx-3 -mb-3 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 [&_button]:h-8"
      )}>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={handleSave}>Save Plan</Button>
      </DialogFooter>
    </>
  );

  if (variant === 'panel') {
    return (
      <div className={cn(
        "rounded-xl border border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950",
        compact ? "p-3" : "p-4",
        className
      )}>
        {editorContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {editorContent}
      </DialogContent>
    </Dialog>
  );
}
