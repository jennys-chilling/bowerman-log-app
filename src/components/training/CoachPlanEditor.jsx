import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

function ActivityForm({ activity, index, canRemove, onChange, onRemove }) {
  const rpeColors = getRpeColorClasses(activity.planned_difficulty);
  const rpeValue = activity.planned_difficulty ?? 5;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Activity {index + 1}</div>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Workout Type</Label>
          <WorkoutTypePicker
            value={activity.workout_type}
            onChange={(value) => onChange('workout_type', value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Goal RPE</Label>
            <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", rpeColors.badge)}>
              {activity.planned_difficulty ? `RPE ${activity.planned_difficulty}` : 'Not set'}
            </span>
          </div>
          <Slider
            value={[rpeValue]}
            onValueChange={([value]) => onChange('planned_difficulty', value)}
            min={1}
            max={10}
            step={1}
            trackClassName={rpeColors.track}
            rangeClassName={rpeColors.range}
            thumbClassName={rpeColors.thumb}
          />
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange('planned_difficulty', null)}>
            Clear RPE
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prescription</Label>
        <Textarea
          value={activity.prescription || ''}
          onChange={(event) => onChange('prescription', event.target.value)}
          placeholder="e.g., 2 mi WU, 6x1000m @ 5K pace w/ 90s rest, 2 mi CD"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Coach Notes</Label>
        <Textarea
          value={activity.coach_notes || ''}
          onChange={(event) => onChange('coach_notes', event.target.value)}
          placeholder="Additional instructions..."
          rows={2}
        />
      </div>
    </div>
  );
}

function ActivitiesForm({ activities, onChange, onDeleteActivity }) {
  const updateActivity = (index, field, value) => {
    onChange(activities.map((activity, activityIndex) => (
      activityIndex === index ? { ...activity, [field]: value } : activity
    )));
  };

  const addActivity = () => onChange([...activities, createCoachActivity()]);
  const removeActivity = (index) => {
    const nextActivities = activities.filter((_, activityIndex) => activityIndex !== index);
    onDeleteActivity(nextActivities, activities[index]);
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <ActivityForm
          key={index}
          activity={activity}
          index={index}
          canRemove={activities.length > 1 || hasCoachActivityData(activity)}
          onChange={(field, value) => updateActivity(index, field, value)}
          onRemove={() => removeActivity(index)}
        />
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addActivity}>
        <Plus className="mr-2 h-4 w-4" />
        Add Activity
      </Button>
    </div>
  );
}

export default function CoachPlanEditor({ open, onClose, dayPlan, date, onSave, onAutoSave }) {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Coach Plan:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="am" className="py-2">
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

          <TabsContent value="am" className="mt-4">
            <ActivitiesForm
              activities={formData.am_coach}
              onChange={(activities) => updateActivities('am_coach', activities)}
              onDeleteActivity={(activities, removedActivity) => deleteActivity('am_coach', activities, removedActivity)}
            />
          </TabsContent>

          <TabsContent value="pm" className="mt-4">
            <ActivitiesForm
              activities={formData.pm_coach}
              onChange={(activities) => updateActivities('pm_coach', activities)}
              onDeleteActivity={(activities, removedActivity) => deleteActivity('pm_coach', activities, removedActivity)}
            />
          </TabsContent>

          <TabsContent value="lift" className="mt-4">
            <div className="space-y-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lift Type</Label>
                  <Input
                    value={formData.lift_coach.lift_type || ''}
                    onChange={(event) => updateLift({ lift_type: event.target.value })}
                    placeholder="e.g., Core, lower body, mobility"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={formData.lift_coach.duration_minutes || ''}
                    onChange={(event) => updateLift({ duration_minutes: parseInt(event.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lift Prescription</Label>
                <Textarea
                  value={formData.lift_coach.prescription || ''}
                  onChange={(event) => updateLift({ prescription: event.target.value })}
                  placeholder="e.g., 3 rounds core, calf raises, hip stability"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Coach Notes</Label>
                <Textarea
                  value={formData.lift_coach.coach_notes || ''}
                  onChange={(event) => updateLift({ coach_notes: event.target.value })}
                  placeholder="Additional lift notes..."
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
