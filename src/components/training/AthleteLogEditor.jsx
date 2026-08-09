import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Dumbbell, Moon, Plus, Sun, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRpeColorClasses } from "./rpeColors";
import {
  getVisibleTrainingFactorOptions,
  sanitizeTrainingFactors,
} from "./trainingFactors";
import {
  LEGACY_WORKOUT_TYPES,
  WORKOUT_TYPE_MENU,
  allowsActivityMileage,
  canHaveStrides,
  countsAsRunMileage,
  displayWorkoutTypes,
  emptyAthleteActivity,
  getAthleteActivities,
  hasAthleteActivityData,
  isBikeType,
  isXTrainOtherType,
  isXTrainType,
  makeAthleteSession,
} from "./sessionUtils";

const AUTOSAVE_DELAY_MS = 1800;
const emptyLift = { duration_minutes: 0, lift_type: '' };

const getEditorDateKey = (dayPlan, date) => {
  if (date) return format(date, 'yyyy-MM-dd');
  return dayPlan?.date || dayPlan?.log_date || dayPlan?.id || 'new';
};

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

  if (shoes.length === 0 || mileage <= 0 || !countsAsRunMileage(activity.session_type)) {
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

const buildPayload = (formData) => {
  const payload = {
    am_session: makeAthleteSession(normalizeActivities(formData.am_session)),
    pm_session: makeAthleteSession(normalizeActivities(formData.pm_session)),
    lift: sanitizeLift(formData.lift),
  };
  const trainingFactors = sanitizeTrainingFactors(formData.training_factors);

  if (Object.keys(trainingFactors).length > 0 || Object.keys(formData.training_factors || {}).length > 0) {
    payload.training_factors = trainingFactors;
  }

  return payload;
};

function WorkoutTypeSinglePicker({ value, onChange, xtrainOther = '' }) {
  const chooseType = (nextValue) => {
    onChange(nextValue);
  };

  const renderMenuItem = (item) => {
    if (item.options?.length) {
      const selectedOption = item.options.find((option) => option.value === value);
      const label = selectedOption ? `${item.label} (${selectedOption.label})` : item.label;

      return (
        <DropdownMenuSub key={item.label}>
          <DropdownMenuSubTrigger className={cn(selectedOption && "font-semibold text-red-700 dark:text-red-200")}>
            <span className="min-w-0 truncate">{label}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {item.options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className={cn(value === option.value && "font-semibold text-red-700 dark:text-red-200")}
                onClick={() => chooseType(option.value)}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {value === option.value && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return (
      <DropdownMenuItem
        key={item.value}
        className={cn(value === item.value && "font-semibold text-red-700 dark:text-red-200")}
        onClick={() => chooseType(item.value)}
      >
        <span className="min-w-0 flex-1">{item.label}</span>
        {value === item.value && <Check className="h-4 w-4" />}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between gap-2 px-3 font-normal"
        >
          <span className={cn("min-w-0 truncate text-left", !value && "text-slate-500 dark:text-slate-400")}>
            {displayWorkoutTypes(value, xtrainOther) || 'Select type'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {WORKOUT_TYPE_MENU.map(renderMenuItem)}
        {LEGACY_WORKOUT_TYPES.includes(value) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => chooseType(value)}>
              <span className="min-w-0 flex-1">{value}</span>
              <Check className="h-4 w-4" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityForm({ activity, index, canDelete, onChange, onDelete, toggleShoe, updateShoeMileage, activeShoes }) {
  const rpeColors = getRpeColorClasses(activity.rpe);
  const rpeValue = activity.rpe ?? 5;
  const mileageAllowed = allowsActivityMileage(activity.session_type);
  const showShoePicker = countsAsRunMileage(activity.session_type);
  const showStrides = canHaveStrides(activity.session_type);
  const isXTrain = isXTrainType(activity.session_type);
  const isBike = isBikeType(activity.session_type);
  const showXTrainOther = isXTrainOtherType(activity.session_type);
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
          <WorkoutTypeSinglePicker
            value={activity.session_type}
            xtrainOther={activity.xtrain_other}
            onChange={(value) => onChange('session_type', value)}
          />
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
          <Label className="text-xs">{isBike ? 'Bike Mileage' : 'Mileage'}</Label>
          <Input
            type="number"
            step="0.1"
            className="h-9"
            disabled={!mileageAllowed}
            value={activity.mileage || ''}
            onChange={(event) => onChange('mileage', parseFloat(event.target.value) || 0)}
            placeholder={mileageAllowed ? undefined : 'No mileage'}
          />
          {!mileageAllowed && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Mileage is not tracked for this activity type.</div>
          )}
        </div>
      </div>

      {showXTrainOther && (
        <div className="space-y-1">
          <Label className="text-xs">X-Train Type</Label>
          <Input
            className="h-9"
            value={activity.xtrain_other || ''}
            onChange={(event) => onChange('xtrain_other', event.target.value)}
            placeholder="e.g., Rowing, stair climber"
          />
        </div>
      )}

      {showStrides && (
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Checkbox
            checked={Boolean(activity.strides)}
            onCheckedChange={(checked) => onChange('strides', Boolean(checked))}
          />
          Add strides
        </label>
      )}

      {showShoePicker && (
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
      )}

      {isXTrain && !showShoePicker && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          X-train activities do not add shoe mileage.
        </div>
      )}

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
        ? (() => {
            const nextActivity = { ...activity, [field]: value };

            if (field === 'session_type') {
              if (!allowsActivityMileage(value)) {
                nextActivity.mileage = 0;
              }
              if (!countsAsRunMileage(value)) {
                nextActivity.shoes = [];
                nextActivity.shoe_mileage = {};
              }
              if (!canHaveStrides(value)) {
                nextActivity.strides = false;
              }
              if (!isXTrainOtherType(value)) {
                nextActivity.xtrain_other = '';
              }
            }

            if (field === 'mileage' && countsAsRunMileage(nextActivity.session_type) && activity.shoes?.length === 1) {
              nextActivity.shoe_mileage = { [activity.shoes[0]]: Number(value) || 0 };
            }

            return nextActivity;
          })()
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

function TrainingFactorsForm({ values, activeOptions, onChange }) {
  const visibleOptions = getVisibleTrainingFactorOptions(
    activeOptions.map((option) => option.key),
    values
  );

  if (visibleOptions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Training Factors</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Daily context</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleOptions.map((option) => (
          <div key={option.key} className="space-y-1">
            <Label htmlFor={`training-factor-${option.key}`} className="text-xs">
              {option.label}
            </Label>
            <Input
              id={`training-factor-${option.key}`}
              value={values?.[option.key] || ''}
              onChange={(event) => onChange(option.key, event.target.value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AthleteLogEditor({
  open,
  onClose,
  dayPlan,
  date,
  onSave,
  onAutoSave,
  onDeleteEntry,
  shoes = [],
  trainingFactorOptions = [],
}) {
  const [formData, setFormData] = useState({
    am_session: [createAthleteActivity()],
    pm_session: [createAthleteActivity()],
    lift: { ...emptyLift },
    training_factors: {},
  });
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const autoSaveTimer = useRef(null);
  const editVersionRef = useRef(0);
  const hasUserEditedRef = useRef(false);
  const loadedDateKeyRef = useRef(null);

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
    if (!open) {
      loadedDateKeyRef.current = null;
      return;
    }

    const nextDateKey = getEditorDateKey(dayPlan, date);
    const isNewSelection = loadedDateKeyRef.current !== nextDateKey;

    if (hasUserEditedRef.current && !isNewSelection) {
      return;
    }

    const amActivities = getAthleteActivities(dayPlan?.am_session);
    const pmActivities = getAthleteActivities(dayPlan?.pm_session);

    setFormData({
      am_session: amActivities.length ? amActivities : [createAthleteActivity()],
      pm_session: pmActivities.length ? pmActivities : [createAthleteActivity()],
      lift: { ...emptyLift, ...(dayPlan?.lift || {}) },
      training_factors: { ...(dayPlan?.training_factors || {}) },
    });
    loadedDateKeyRef.current = nextDateKey;
    editVersionRef.current = 0;
    markClean();
  }, [date, dayPlan, open]);

  useEffect(() => {
    if (!open || !hasUserEdited || !onAutoSave) {
      return undefined;
    }

    window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      const versionAtSave = editVersionRef.current;

      Promise.resolve(onAutoSave(buildPayload(formData)))
        .then(() => {
          if (editVersionRef.current === versionAtSave) {
            markClean();
          }
        })
        .catch(() => {});
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(autoSaveTimer.current);
  }, [formData, hasUserEdited, onAutoSave, open]);

  const updateActivities = (sessionKey, activities) => {
    markEdited();
    setFormData((current) => ({ ...current, [sessionKey]: activities }));
  };

  const commitDeletedEntry = async (nextFormData) => {
    window.clearTimeout(autoSaveTimer.current);
    editVersionRef.current += 1;
    setFormData(nextFormData);
    markClean();

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
    markEdited();
    setFormData((current) => ({ ...current, lift: { ...current.lift, ...updates } }));
  };

  const updateTrainingFactor = (key, value) => {
    markEdited();
    setFormData((current) => ({
      ...current,
      training_factors: {
        ...(current.training_factors || {}),
        [key]: value,
      },
    }));
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
    editVersionRef.current += 1;
    markClean();
    onSave(buildPayload(formData));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="btc-editor-dialog max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Athlete Log:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <TrainingFactorsForm
          values={formData.training_factors}
          activeOptions={trainingFactorOptions}
          onChange={updateTrainingFactor}
        />

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

        <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave}>Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
