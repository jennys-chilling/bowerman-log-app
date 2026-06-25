import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dumbbell, Moon, Plus, Sun, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRpeColorClasses } from "./rpeColors";
import {
  WORKOUT_TYPES,
  emptyAthleteActivity,
  getAthleteActivities,
  hasAthleteActivityData,
  makeAthleteSession,
} from "./sessionUtils";

const emptyLift = { duration_minutes: 0, lift_type: '' };

const createAthleteActivity = () => ({
  ...emptyAthleteActivity,
  shoes: [],
  shoe_mileage: {},
});

const sanitizeLift = (lift = {}) => {
  const normalizedLift = {
    duration_minutes: Number(lift.duration_minutes) || 0,
    lift_type: lift.lift_type || '',
  };

  return normalizedLift.duration_minutes > 0 || normalizedLift.lift_type.trim()
    ? normalizedLift
    : {};
};

const hasLiftData = (lift = {}) => (
  Number(lift.duration_minutes) > 0 ||
  Boolean(lift.lift_type?.trim())
);

const normalizeActivityShoeMileage = (activity = {}) => {
  const mileage = Number(activity.mileage) || 0;
  const shoes = activity.shoes || [];
  const existingSplits = Object.fromEntries(
    Object.entries(activity.shoe_mileage || {})
      .filter(([shoeId]) => shoes.includes(shoeId))
      .map(([shoeId, shoeMileage]) => [shoeId, Number(shoeMileage) || 0])
      .filter(([, shoeMileage]) => shoeMileage > 0)
  );

  if (shoes.length === 0 || mileage <= 0 || activity.session_type === 'Off') {
    return { ...activity, shoe_mileage: {} };
  }

  if (Object.keys(existingSplits).length === 0) {
    if (shoes.length === 1) {
      return { ...activity, shoe_mileage: { [shoes[0]]: mileage } };
    }

    const evenSplit = Math.floor((mileage / shoes.length) * 10) / 10;
    const shoeMileage = Object.fromEntries(shoes.map((shoeId) => [shoeId, evenSplit]));
    const remainder = Number((mileage - (evenSplit * shoes.length)).toFixed(1));
    shoeMileage[shoes[shoes.length - 1]] = Number((shoeMileage[shoes[shoes.length - 1]] + remainder).toFixed(1));
    return { ...activity, shoe_mileage: shoeMileage };
  }

  return { ...activity, shoe_mileage: existingSplits };
};

const normalizeActivities = (activities = []) => activities.map(normalizeActivityShoeMileage);

const buildPayload = (formData) => ({
  am_session: makeAthleteSession(normalizeActivities(formData.am_session)),
  pm_session: makeAthleteSession(normalizeActivities(formData.pm_session)),
  lift: sanitizeLift(formData.lift),
});

function ActivityForm({ activity, index, canDelete, onChange, onDelete, toggleShoe, updateShoeMileage, activeShoes }) {
  const rpeColors = getRpeColorClasses(activity.rpe);
  const rpeValue = activity.rpe ?? 5;
  const selectedShoes = activeShoes.filter((shoe) => activity.shoes?.includes(shoe.id));
  const splitTotal = Object.entries(activity.shoe_mileage || {})
    .filter(([shoeId]) => activity.shoes?.includes(shoeId))
    .reduce((sum, [, mileage]) => sum + (Number(mileage) || 0), 0);
  const activityMileage = Number(activity.mileage) || 0;
  const hasSplitMismatch = selectedShoes.length > 0 && activityMileage > 0 && Math.abs(splitTotal - activityMileage) > 0.05;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Activity {index + 1}</div>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300"
            onClick={onDelete}
            aria-label={`Delete activity ${index + 1}`}
            title="Delete activity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={activity.session_type || undefined} onValueChange={(value) => onChange('session_type', value)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            className="h-9"
            value={activity.duration_minutes || ''}
            onChange={(event) => onChange('duration_minutes', parseInt(event.target.value, 10) || 0)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Mileage</Label>
          <Input
            type="number"
            step="0.1"
            className="h-9"
            value={activity.mileage || ''}
            onChange={(event) => onChange('mileage', parseFloat(event.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Shoes</Label>
        <div className="flex flex-wrap gap-2">
          {activeShoes.map((shoe) => (
            <Badge
              key={shoe.id}
              variant={activity.shoes?.includes(shoe.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleShoe(shoe.id)}
            >
              {shoe.name}
              {activity.shoes?.includes(shoe.id) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
          {activeShoes.length === 0 && (
            <span className="text-xs text-slate-400">No active shoes. Add them in Shoe Inventory.</span>
          )}
        </div>
        {selectedShoes.length > 0 && activityMileage > 0 && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
            {selectedShoes.map((shoe) => (
              <div key={shoe.id} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2">
                <div className="min-w-0 text-xs font-medium text-slate-700 dark:text-slate-200">{shoe.name}</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-8"
                  value={activity.shoe_mileage?.[shoe.id] ?? ''}
                  onChange={(event) => updateShoeMileage(shoe.id, parseFloat(event.target.value) || 0)}
                  placeholder="mi"
                />
              </div>
            ))}
            <div className={cn(
              "text-xs",
              hasSplitMismatch ? "text-red-700 dark:text-red-300" : "text-slate-500 dark:text-slate-300"
            )}>
              Shoe total: {splitTotal.toFixed(1)} / {activityMileage.toFixed(1)} mi
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs">RPE (1-10)</Label>
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", rpeColors.badge)}>
            {activity.rpe ?? 'Not set'}
          </span>
        </div>
        <Slider
          value={[rpeValue]}
          onValueChange={([value]) => onChange('rpe', value)}
          min={1}
          max={10}
          step={1}
          trackClassName={rpeColors.track}
          rangeClassName={rpeColors.range}
          thumbClassName={rpeColors.thumb}
        />
        <div className={cn("text-xs font-medium", rpeColors.labelText)}>
          {rpeColors.label}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Comments</Label>
        <Textarea
          value={activity.comments || ''}
          onChange={(event) => onChange('comments', event.target.value)}
          placeholder="How did it feel?"
          rows={2}
        />
      </div>
    </div>
  );
}

function ActivitiesForm({ activities, onChange, onDeleteActivity, activeShoes }) {
  const updateActivity = (index, field, value) => {
    onChange(activities.map((activity, activityIndex) => (
      activityIndex === index
        ? {
            ...activity,
            [field]: value,
            ...(field === 'mileage' && activity.shoes?.length === 1
              ? { shoe_mileage: { [activity.shoes[0]]: Number(value) || 0 } }
              : {}),
          }
        : activity
    )));
  };

  const toggleShoe = (index, shoeId) => {
    const currentShoes = activities[index].shoes || [];
    const currentSplits = activities[index].shoe_mileage || {};
    const newShoes = currentShoes.includes(shoeId)
      ? currentShoes.filter((id) => id !== shoeId)
      : [...currentShoes, shoeId];
    const newSplits = Object.fromEntries(
      Object.entries(currentSplits).filter(([id]) => newShoes.includes(id))
    );
    if (!currentShoes.includes(shoeId)) {
      const mileage = Number(activities[index].mileage) || 0;
      newSplits[shoeId] = newShoes.length === 1 ? mileage : 0;
    }
    onChange(activities.map((activity, activityIndex) => (
      activityIndex === index ? { ...activity, shoes: newShoes, shoe_mileage: newSplits } : activity
    )));
  };

  const updateShoeMileage = (index, shoeId, mileage) => {
    updateActivity(index, 'shoe_mileage', {
      ...(activities[index].shoe_mileage || {}),
      [shoeId]: mileage,
    });
  };

  const addActivity = () => onChange([...activities, createAthleteActivity()]);
  const deleteActivity = (index) => {
    const nextActivities = activities.length > 1
      ? activities.filter((_, activityIndex) => activityIndex !== index)
      : [createAthleteActivity()];

    onDeleteActivity(nextActivities, activities[index]);
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <ActivityForm
          key={index}
          activity={activity}
          index={index}
          canDelete={activities.length > 1 || hasAthleteActivityData(activity)}
          onChange={(field, value) => updateActivity(index, field, value)}
          onDelete={() => deleteActivity(index)}
          toggleShoe={(shoeId) => toggleShoe(index, shoeId)}
          updateShoeMileage={(shoeId, mileage) => updateShoeMileage(index, shoeId, mileage)}
          activeShoes={activeShoes}
        />
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addActivity}>
        <Plus className="mr-2 h-4 w-4" />
        Add Activity
      </Button>
    </div>
  );
}

export default function AthleteLogEditor({ open, onClose, dayPlan, date, onSave, onAutoSave, onDeleteEntry, shoes = [] }) {
  const [formData, setFormData] = useState({
    am_session: [createAthleteActivity()],
    pm_session: [createAthleteActivity()],
    lift: { ...emptyLift },
  });
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    const amActivities = getAthleteActivities(dayPlan?.am_session);
    const pmActivities = getAthleteActivities(dayPlan?.pm_session);

    setFormData({
      am_session: amActivities.length ? amActivities : [createAthleteActivity()],
      pm_session: pmActivities.length ? pmActivities : [createAthleteActivity()],
      lift: { ...emptyLift, ...(dayPlan?.lift || {}) },
    });
    setHasUserEdited(false);
  }, [dayPlan, open]);

  useEffect(() => {
    if (!open || !hasUserEdited || !onAutoSave) {
      return undefined;
    }

    window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      onAutoSave(buildPayload(formData));
    }, 900);

    return () => window.clearTimeout(autoSaveTimer.current);
  }, [formData, hasUserEdited, onAutoSave, open]);

  const updateActivities = (sessionKey, activities) => {
    setHasUserEdited(true);
    setFormData((current) => ({ ...current, [sessionKey]: activities }));
  };

  const commitDeletedEntry = async (nextFormData) => {
    window.clearTimeout(autoSaveTimer.current);
    setFormData(nextFormData);
    setHasUserEdited(false);

    if (onDeleteEntry) {
      await onDeleteEntry(buildPayload(nextFormData));
    } else if (onAutoSave) {
      await onAutoSave(buildPayload(nextFormData));
    }
  };

  const deleteActivity = (sessionKey, nextActivities, removedActivity) => {
    const shouldConfirm = hasAthleteActivityData(removedActivity);

    if (shouldConfirm && !window.confirm('Delete this log activity?')) {
      return;
    }

    const nextFormData = { ...formData, [sessionKey]: nextActivities };

    if (!shouldConfirm) {
      updateActivities(sessionKey, nextActivities);
      return;
    }

    void commitDeletedEntry(nextFormData);
  };

  const updateLift = (updates) => {
    setHasUserEdited(true);
    setFormData((current) => ({ ...current, lift: { ...current.lift, ...updates } }));
  };

  const deleteLift = () => {
    if (hasLiftData(formData.lift) && !window.confirm('Delete this lift log?')) {
      return;
    }

    void commitDeletedEntry({ ...formData, lift: { ...emptyLift } });
  };

  const activeShoes = shoes.filter((shoe) => shoe.status === 'Active');

  const handleSave = () => {
    window.clearTimeout(autoSaveTimer.current);
    onSave(buildPayload(formData));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Athlete Log:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="am" className="py-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="am" className="text-xs"><Sun className="mr-1 h-3 w-3" /> AM</TabsTrigger>
            <TabsTrigger value="pm" className="text-xs"><Moon className="mr-1 h-3 w-3" /> PM</TabsTrigger>
            <TabsTrigger value="lift" className="text-xs"><Dumbbell className="mr-1 h-3 w-3" /> Lift</TabsTrigger>
          </TabsList>

          <TabsContent value="am" className="mt-4">
            <ActivitiesForm
              activities={formData.am_session}
              onChange={(activities) => updateActivities('am_session', activities)}
              onDeleteActivity={(activities, removedActivity) => deleteActivity('am_session', activities, removedActivity)}
              activeShoes={activeShoes}
            />
          </TabsContent>

          <TabsContent value="pm" className="mt-4">
            <ActivitiesForm
              activities={formData.pm_session}
              onChange={(activities) => updateActivities('pm_session', activities)}
              onDeleteActivity={(activities, removedActivity) => deleteActivity('pm_session', activities, removedActivity)}
              activeShoes={activeShoes}
            />
          </TabsContent>

          <TabsContent value="lift" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <Dumbbell className="h-4 w-4" />
                  Lift Session
                </div>
                {hasLiftData(formData.lift) && (
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
                <div className="space-y-1">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    value={formData.lift.duration_minutes || ''}
                    onChange={(event) => updateLift({ duration_minutes: parseInt(event.target.value, 10) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Input
                    value={formData.lift.lift_type || ''}
                    onChange={(event) => updateLift({ lift_type: event.target.value })}
                    placeholder="e.g., Upper body, Core..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave}>Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
