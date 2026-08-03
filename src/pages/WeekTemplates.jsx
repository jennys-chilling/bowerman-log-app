import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Dumbbell,
  FilePlus2,
  Layers,
  Loader2,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2,
  UserCircle,
  Users,
} from 'lucide-react';
import { appClient } from '@/api/client';
import { AppHeader, AppPage } from '@/components/AppChrome';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import WorkoutTypePicker from '@/components/training/WorkoutTypePicker';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { getRpeColorClasses } from '@/components/training/rpeColors';
import {
  canHaveStrides,
  emptyCoachActivity,
  emptyCoachLift,
  getCoachActivities,
  hasCoachLiftData,
  hasCoachSessionData,
  isXTrainOtherType,
  makeCoachSession,
  sanitizeCoachLift,
} from '@/components/training/sessionUtils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const createCoachActivity = () => ({ ...emptyCoachActivity });
const createEditableCoachSession = () => ({ activities: [createCoachActivity()] });
const createEditableCoachLift = () => ({ ...emptyCoachLift, _editing: true });

const isDraftSessionOpen = (session = {}) => (
  hasCoachSessionData(session) ||
  Array.isArray(session?.activities)
);

const isDraftLiftOpen = (lift = {}) => (
  hasCoachLiftData(lift) ||
  Boolean(lift?._editing)
);

const normalizeDraftActivity = (activity = {}) => ({
  ...emptyCoachActivity,
  ...activity,
  workout_type: activity.workout_type || '',
  xtrain_other: activity.xtrain_other || '',
  planned_difficulty:
    activity.planned_difficulty === null || activity.planned_difficulty === undefined || activity.planned_difficulty === ''
      ? null
      : Number(activity.planned_difficulty),
  prescription: activity.prescription || '',
  coach_notes: activity.coach_notes || '',
});

const createBlankDays = () => DAYS.map((day) => ({
  day_of_week: day,
  am_coach: {},
  pm_coach: {},
  lift_coach: {},
}));

const parseOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

const getDisplayName = (athlete = {}) => {
  const structuredName = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim();
  return structuredName || athlete.full_name || athlete.email;
};

const getInitials = (athlete = {}) => {
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.trim();
  return (initials || athlete.full_name?.[0] || athlete.email?.[0] || 'A').toUpperCase();
};

const getTemplateErrorMessage = (error) => {
  const message = error?.message || 'Could not use week templates.';
  if (message.includes('week_templates') || message.includes('schema cache')) {
    return 'Week templates need the latest Supabase schema. Run the week_templates SQL from supabase/schema.sql, then refresh.';
  }
  return message;
};

const normalizeTemplateDays = (days = []) => DAYS.map((day, index) => {
  const source = Array.isArray(days)
    ? days.find((templateDay) => templateDay?.day_of_week === day) || days[index] || {}
    : {};

  return {
    day_of_week: day,
    am_coach: makeCoachSession(getCoachActivities(source.am_coach)),
    pm_coach: makeCoachSession(getCoachActivities(source.pm_coach)),
    lift_coach: sanitizeCoachLift(source.lift_coach),
  };
});

const hasTemplateContent = (template = {}) => (
  template.goal_mileage_min !== null && template.goal_mileage_min !== undefined ||
  template.goal_mileage_max !== null && template.goal_mileage_max !== undefined ||
  normalizeTemplateDays(template.days).some((day) => (
    hasCoachSessionData(day.am_coach) ||
    hasCoachSessionData(day.pm_coach) ||
    hasCoachLiftData(day.lift_coach)
  ))
);

function TemplateListItem({ template, selected, onSelect }) {
  const days = normalizeTemplateDays(template.days);
  const plannedDays = days.filter((day) => (
    hasCoachSessionData(day.am_coach) ||
    hasCoachSessionData(day.pm_coach) ||
    hasCoachLiftData(day.lift_coach)
  )).length;

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border px-3 py-3 text-left transition-colors",
        selected
          ? "border-red-700 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
      )}
      onClick={onSelect}
    >
      <div className="truncate text-sm font-semibold">{template.name}</div>
      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>{plannedDays} day{plannedDays === 1 ? '' : 's'}</span>
        {template.goal_mileage_min != null || template.goal_mileage_max != null ? (
          <span>
            {formatOptionalNumber(template.goal_mileage_min) || '?'}-{formatOptionalNumber(template.goal_mileage_max) || '?'} mi
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SessionEditor({ title, icon: Icon, session, onChange, onRemove }) {
  const activities = getCoachActivities(session);
  const visibleActivities = activities.length ? activities : [createCoachActivity()];

  const updateActivities = (nextActivities) => {
    onChange({ activities: nextActivities.map(normalizeDraftActivity) });
  };

  const updateActivity = (index, field, value) => {
    updateActivities(visibleActivities.map((activity, activityIndex) => (
      activityIndex === index
        ? {
            ...activity,
            [field]: value,
            ...(field === 'workout_type' && !canHaveStrides(value) ? { strides: false } : {}),
            ...(field === 'workout_type' && !isXTrainOtherType(value) ? { xtrain_other: '' } : {}),
          }
        : activity
    )));
  };

  const addActivity = () => updateActivities([...visibleActivities, createCoachActivity()]);
  const removeActivity = (index) => updateActivities(visibleActivities.filter((_, activityIndex) => activityIndex !== index));

  return (
    <div className="space-y-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-red-700 dark:text-red-300" />
          {title}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove} aria-label={`Remove ${title}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {visibleActivities.map((activity, index) => {
        const rpeColors = getRpeColorClasses(activity.planned_difficulty);
        const rpeValue = activity.planned_difficulty ?? 5;

        return (
          <div key={index} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activity {index + 1}</span>
              {visibleActivities.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeActivity(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <WorkoutTypePicker
                  value={activity.workout_type}
                  xtrainOther={activity.xtrain_other}
                  onChange={(value) => updateActivity(index, 'workout_type', value)}
                  triggerClassName="h-9"
                />
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Select multiple for OR.</div>
              </div>

              {isXTrainOtherType(activity.workout_type) && (
                <div className="space-y-1">
                  <Label className="text-xs">X-Train Type</Label>
                  <Input
                    value={activity.xtrain_other || ''}
                    onChange={(event) => updateActivity(index, 'xtrain_other', event.target.value)}
                    placeholder="e.g., Rowing, stair climber"
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Goal RPE</Label>
                  <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold", rpeColors.badge)}>
                    {activity.planned_difficulty ? `RPE ${activity.planned_difficulty}` : 'Not set'}
                  </span>
                </div>
                <Slider
                  value={[rpeValue]}
                  onValueChange={([value]) => updateActivity(index, 'planned_difficulty', value)}
                  min={1}
                  max={10}
                  step={1}
                  trackClassName={rpeColors.track}
                  rangeClassName={rpeColors.range}
                  thumbClassName={rpeColors.thumb}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => updateActivity(index, 'planned_difficulty', null)}
                >
                  Clear RPE
                </Button>
              </div>
            </div>

            {canHaveStrides(activity.workout_type) && (
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <Checkbox
                  checked={Boolean(activity.strides)}
                  onCheckedChange={(checked) => updateActivity(index, 'strides', Boolean(checked))}
                />
                Add strides
              </label>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Prescription</Label>
              <Textarea
                value={activity.prescription || ''}
                onChange={(event) => updateActivity(index, 'prescription', event.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Coach Notes</Label>
              <Textarea
                value={activity.coach_notes || ''}
                onChange={(event) => updateActivity(index, 'coach_notes', event.target.value)}
                rows={2}
              />
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addActivity}>
        Add Activity
      </Button>
    </div>
  );
}

function LiftEditor({ lift, onChange, onRemove }) {
  const updateLift = (updates) => {
    const nextLift = { ...emptyCoachLift, ...lift, ...updates };
    onChange(hasCoachLiftData(nextLift) ? sanitizeCoachLift(nextLift) : { ...nextLift, _editing: true });
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-red-700 dark:text-red-300" />
          Lift
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove} aria-label="Remove Lift">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Lift Type</Label>
          <Input
            value={lift?.lift_type || ''}
            onChange={(event) => updateLift({ lift_type: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duration</Label>
          <Input
            type="number"
            value={lift?.duration_minutes || ''}
            onChange={(event) => updateLift({ duration_minutes: parseInt(event.target.value, 10) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Prescription</Label>
        <Textarea
          value={lift?.prescription || ''}
          onChange={(event) => updateLift({ prescription: event.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Coach Notes</Label>
        <Textarea
          value={lift?.coach_notes || ''}
          onChange={(event) => updateLift({ coach_notes: event.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

function DayTemplateCard({ day, shortDay, onChange }) {
  const showAm = isDraftSessionOpen(day.am_coach);
  const showPm = isDraftSessionOpen(day.pm_coach);
  const showLift = isDraftLiftOpen(day.lift_coach);

  return (
    <div className="flex min-h-[360px] min-w-[150px] flex-1 flex-col border-r border-slate-300 bg-slate-100 last:border-r-0 dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-300 bg-white px-2 py-2 text-center dark:border-slate-700 dark:bg-slate-950">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{shortDay}</div>
        <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{day.day_of_week}</div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {showAm && (
          <SessionEditor
            title="AM"
            icon={Sun}
            session={day.am_coach}
            onChange={(session) => onChange({ ...day, am_coach: session })}
            onRemove={() => onChange({ ...day, am_coach: {} })}
          />
        )}
        {showPm && (
          <SessionEditor
            title="PM"
            icon={Moon}
            session={day.pm_coach}
            onChange={(session) => onChange({ ...day, pm_coach: session })}
            onRemove={() => onChange({ ...day, pm_coach: {} })}
          />
        )}
        {showLift && (
          <LiftEditor
            lift={day.lift_coach}
            onChange={(lift) => onChange({ ...day, lift_coach: lift })}
            onRemove={() => onChange({ ...day, lift_coach: {} })}
          />
        )}

        {(!showAm || !showPm || !showLift) && (
          <div className="mt-auto grid gap-2 pt-1">
            {!showAm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start bg-white text-xs dark:bg-slate-950"
                onClick={() => onChange({ ...day, am_coach: createEditableCoachSession() })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add AM
              </Button>
            )}
            {!showPm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start bg-white text-xs dark:bg-slate-950"
                onClick={() => onChange({ ...day, pm_coach: createEditableCoachSession() })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add PM
              </Button>
            )}
            {!showLift && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 justify-start bg-white text-xs dark:bg-slate-950"
                onClick={() => onChange({ ...day, lift_coach: createEditableCoachLift() })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Lift
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplyTemplateDialog({
  open,
  onClose,
  athletes,
  template,
  isSubmitting,
  onApply,
}) {
  const [selectedAthleteIds, setSelectedAthleteIds] = useState([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

  const targetAthletes = useMemo(
    () => athletes.filter((athlete) => athlete.role !== 'admin'),
    [athletes]
  );

  useEffect(() => {
    if (!open) {
      setSelectedAthleteIds([]);
      setOverwriteExisting(false);
      setWeekStartDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    }
  }, [open]);

  const allSelected = targetAthletes.length > 0 && selectedAthleteIds.length === targetAthletes.length;
  const canApply = selectedAthleteIds.length > 0 && weekStartDate && template && hasTemplateContent(template) && !isSubmitting;

  const toggleAthlete = (athleteId, checked) => {
    setSelectedAthleteIds((current) => {
      if (checked) {
        return current.includes(athleteId) ? current : [...current, athleteId];
      }
      return current.filter((id) => id !== athleteId);
    });
  };

  const toggleAll = (checked) => {
    setSelectedAthleteIds(checked ? targetAthletes.map((athlete) => athlete.id) : []);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-red-700 dark:text-red-300" />
            Apply Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{template?.name}</div>
          </div>

          <div className="space-y-1">
            <Label>Week Start</Label>
            <Input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Athletes</Label>
              {targetAthletes.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-red-700 hover:text-red-800 dark:text-red-300"
                  onClick={() => toggleAll(!allSelected)}
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {targetAthletes.map((athlete) => {
                const checked = selectedAthleteIds.includes(athlete.id);
                return (
                  <label
                    key={athlete.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleAthlete(athlete.id, Boolean(value))} />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={athlete.profile_image_url} alt={getDisplayName(athlete)} className="object-cover" />
                      <AvatarFallback className="text-xs font-semibold">{getInitials(athlete)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{getDisplayName(athlete)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
            <div>
              <Label htmlFor="template-overwrite">Overwrite Existing Coach Plans</Label>
              {overwriteExisting && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">Existing target coach workouts and week coach feedback will be replaced.</p>
              )}
            </div>
            <Switch id="template-overwrite" checked={overwriteExisting} onCheckedChange={setOverwriteExisting} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={() => onApply({ template, athleteIds: selectedAthleteIds, weekStartDate, overwriteExisting })}
            disabled={!canApply}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WeekTemplates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();
  const isCoach = user?.role === 'admin';
  const trainingLogUrl = `${createPageUrl('TrainingLog')}${location.search}`;
  const accountUrl = `${createPageUrl('Account')}${location.search}`;
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: templates = [], isLoading: loadingTemplates, error: templatesError } = useQuery({
    queryKey: ['weekTemplates'],
    queryFn: () => appClient.entities.WeekTemplate.list('-updated_at'),
    enabled: isCoach,
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => appClient.entities.User.list(),
    enabled: isCoach,
  });

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  useEffect(() => {
    if (templates.length > 0 && (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId))) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedTemplate) {
      setDraft(null);
      setIsDirty(false);
      return;
    }

    setDraft({
      ...selectedTemplate,
      days: normalizeTemplateDays(selectedTemplate.days),
      goal_mileage_min: formatOptionalNumber(selectedTemplate.goal_mileage_min),
      goal_mileage_max: formatOptionalNumber(selectedTemplate.goal_mileage_max),
    });
    setIsDirty(false);
  }, [selectedTemplate]);

  const createTemplateMutation = useMutation({
    mutationFn: () => appClient.entities.WeekTemplate.create({
      coach_id: user.id,
      name: 'New Week Template',
      description: '',
      goal_mileage_min: null,
      goal_mileage_max: null,
      days: createBlankDays(),
    }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['weekTemplates'] });
      setSelectedTemplateId(template.id);
      toast({ title: 'Template created' });
    },
    onError: (error) => {
      toast({
        title: 'Template create failed',
        description: getTemplateErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (templateDraft) => appClient.entities.WeekTemplate.update(templateDraft.id, {
      name: templateDraft.name.trim(),
      description: templateDraft.description || '',
      goal_mileage_min: parseOptionalNumber(templateDraft.goal_mileage_min),
      goal_mileage_max: parseOptionalNumber(templateDraft.goal_mileage_max),
      days: normalizeTemplateDays(templateDraft.days),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekTemplates'] });
      setIsDirty(false);
      toast({ title: 'Template saved' });
    },
    onError: (error) => {
      toast({
        title: 'Template save failed',
        description: getTemplateErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (template) => appClient.entities.WeekTemplate.create({
      coach_id: user.id,
      name: `${template.name} Copy`,
      description: template.description || '',
      goal_mileage_min: parseOptionalNumber(template.goal_mileage_min),
      goal_mileage_max: parseOptionalNumber(template.goal_mileage_max),
      days: normalizeTemplateDays(template.days),
    }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['weekTemplates'] });
      setSelectedTemplateId(template.id);
      toast({ title: 'Template duplicated' });
    },
    onError: (error) => {
      toast({
        title: 'Template duplicate failed',
        description: getTemplateErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => appClient.entities.WeekTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekTemplates'] });
      setSelectedTemplateId(null);
      toast({ title: 'Template deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Template delete failed',
        description: getTemplateErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({ template, athleteIds, weekStartDate, overwriteExisting }) => {
      const templateDays = normalizeTemplateDays(template.days);
      const templateGoal = {
        goal_mileage_min: template.goal_mileage_min ?? null,
        goal_mileage_max: template.goal_mileage_max ?? null,
      };
      const templateCoachFeedback = template.description?.trim() || '';
      const hasGoal = templateGoal.goal_mileage_min !== null || templateGoal.goal_mileage_max !== null;
      const hasCoachFeedback = Boolean(templateCoachFeedback);
      let updatedDays = 0;
      let updatedWeeks = 0;

      const ensureTargetWeek = async (athleteId) => {
        const existingWeeks = await appClient.entities.TrainingWeek.filter({
          athlete_id: athleteId,
          week_start_date: weekStartDate,
        });

        const week = existingWeeks[0] || await appClient.entities.TrainingWeek.create({
          athlete_id: athleteId,
          week_start_date: weekStartDate,
          ...templateGoal,
          ...(hasCoachFeedback ? { coach_feedback: templateCoachFeedback } : {}),
        });

        if (existingWeeks[0]) {
          const weekUpdates = {};

          if (
            hasGoal &&
            (
              overwriteExisting ||
              (
                (week.goal_mileage_min === null || week.goal_mileage_min === undefined) &&
                (week.goal_mileage_max === null || week.goal_mileage_max === undefined)
              )
            )
          ) {
            Object.assign(weekUpdates, templateGoal);
          }

          if (
            hasCoachFeedback &&
            (
              overwriteExisting ||
              !week.coach_feedback?.trim()
            )
          ) {
            weekUpdates.coach_feedback = templateCoachFeedback;
          }

          if (Object.keys(weekUpdates).length > 0) {
            await appClient.entities.TrainingWeek.update(week.id, weekUpdates);
            updatedWeeks += 1;
          }
        } else if (hasGoal || hasCoachFeedback) {
          updatedWeeks += 1;
        }

        const existingDayPlans = await appClient.entities.DayPlan.filter({ training_week_id: week.id });
        const existingByDate = new Map(existingDayPlans.map((dayPlan) => [dayPlan.date, dayPlan]));
        const missingDayPlans = DAYS
          .map((day, index) => ({
            training_week_id: week.id,
            date: format(addDays(new Date(`${weekStartDate}T00:00:00`), index), 'yyyy-MM-dd'),
            day_of_week: day,
          }))
          .filter((dayPlan) => !existingByDate.has(dayPlan.date));

        const createdDayPlans = missingDayPlans.length
          ? await appClient.entities.DayPlan.bulkCreate(missingDayPlans)
          : [];

        return new Map(
          [...existingDayPlans, ...createdDayPlans].map((dayPlan) => [dayPlan.date, dayPlan])
        );
      };

      for (const athleteId of athleteIds) {
        const targetByDate = await ensureTargetWeek(athleteId);

        for (const dayIndex of DAYS.keys()) {
          const date = format(addDays(new Date(`${weekStartDate}T00:00:00`), dayIndex), 'yyyy-MM-dd');
          const targetDayPlan = targetByDate.get(date);
          const sourceDay = templateDays[dayIndex];

          if (!targetDayPlan || !sourceDay) continue;

          const data = {};
          if (overwriteExisting) {
            data.am_coach = sourceDay.am_coach || {};
            data.pm_coach = sourceDay.pm_coach || {};
            data.lift_coach = sourceDay.lift_coach || {};
          } else {
            if (hasCoachSessionData(sourceDay.am_coach) && !hasCoachSessionData(targetDayPlan.am_coach)) {
              data.am_coach = sourceDay.am_coach;
            }
            if (hasCoachSessionData(sourceDay.pm_coach) && !hasCoachSessionData(targetDayPlan.pm_coach)) {
              data.pm_coach = sourceDay.pm_coach;
            }
            if (hasCoachLiftData(sourceDay.lift_coach) && !hasCoachLiftData(targetDayPlan.lift_coach)) {
              data.lift_coach = sourceDay.lift_coach;
            }
          }

          if (Object.keys(data).length > 0) {
            await appClient.entities.DayPlan.update(targetDayPlan.id, data);
            updatedDays += 1;
          }
        }
      }

      return { athleteCount: athleteIds.length, updatedDays, updatedWeeks };
    },
    onSuccess: ({ athleteCount, updatedDays, updatedWeeks }) => {
      queryClient.invalidateQueries({ queryKey: ['trainingWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] });
      queryClient.invalidateQueries({ queryKey: ['monthWeeks'] });
      queryClient.invalidateQueries({ queryKey: ['monthDayPlans'] });
      setApplyOpen(false);
      toast({
        title: 'Template applied',
        description: `${athleteCount} athlete${athleteCount === 1 ? '' : 's'}, ${updatedDays} day${updatedDays === 1 ? '' : 's'} updated${updatedWeeks > 0 ? `, ${updatedWeeks} week detail update${updatedWeeks === 1 ? '' : 's'}` : ''}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Template apply failed',
        description: error.message || 'Could not apply this template.',
        variant: 'destructive',
      });
    },
  });

  const updateDraft = (updates) => {
    setDraft((current) => ({ ...current, ...updates }));
    setIsDirty(true);
  };

  const updateDraftDay = (index, day) => {
    updateDraft({
      days: draft.days.map((currentDay, dayIndex) => (dayIndex === index ? day : currentDay)),
    });
  };

  const handleSave = () => {
    if (!draft?.name?.trim()) {
      toast({ title: 'Template name required', variant: 'destructive' });
      return;
    }
    saveTemplateMutation.mutate(draft);
  };

  const handleDelete = () => {
    if (!draft?.id) return;
    const confirmed = window.confirm(`Delete "${draft.name}"?`);
    if (confirmed) {
      deleteTemplateMutation.mutate(draft.id);
    }
  };

  if (!isCoach) {
    return (
      <div className="btc-app-shell min-h-screen text-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-slate-300 bg-white p-8 text-center shadow-md dark:border-slate-700 dark:bg-slate-950">
            <h1 className="text-xl font-semibold">Coach Access Only</h1>
            <div className="mt-5">
              <Link to={trainingLogUrl}>
                <Button>Back to Log</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const targetAthleteCount = athletes.filter((athlete) => athlete.role !== 'admin').length;

  return (
    <div className="btc-app-shell min-h-screen text-slate-900 dark:text-slate-100">
      <AppPage>
        <AppHeader
          title="Bowerman Training Log"
          subtitle="Templates"
          actions={(
            <>
              <Link to={trainingLogUrl}>
                <Button variant="outline" className="h-9 rounded-full px-3 text-sm font-semibold sm:px-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Log
                </Button>
              </Link>
              <Link to={accountUrl}>
                <Button variant="outline" className="h-9 rounded-full px-3 text-sm font-semibold sm:px-4">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Account
                </Button>
              </Link>
            </>
          )}
        />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <div className="btc-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <Layers className="h-4 w-4 text-red-700 dark:text-red-300" />
                  Library
                </div>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
                  onClick={() => createTemplateMutation.mutate()}
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                </Button>
              </div>

              {loadingTemplates ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : templatesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  {getTemplateErrorMessage(templatesError)}
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-slate-200 px-3 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No templates yet.
                </div>
              ) : (
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                  {templates.map((template) => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      selected={template.id === selectedTemplateId}
                      onSelect={() => setSelectedTemplateId(template.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            {!draft ? (
              <div className="btc-panel p-8 text-center sm:p-12">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">Select or create a template</h2>
                <div className="mt-5">
                  <Button onClick={() => createTemplateMutation.mutate()} disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                    New Template
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="btc-panel p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={draft.name || ''} onChange={(event) => updateDraft({ name: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Goal Min</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.goal_mileage_min}
                        onChange={(event) => updateDraft({ goal_mileage_min: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Goal Max</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.goal_mileage_max}
                        onChange={(event) => updateDraft({ goal_mileage_max: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Week Coach Notes</Label>
                    <Textarea
                      value={draft.description || ''}
                      onChange={(event) => updateDraft({ description: event.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      {targetAthleteCount} athlete{targetAthleteCount === 1 ? '' : 's'}
                      {isDirty && <Badge variant="outline">Unsaved</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => duplicateTemplateMutation.mutate(draft)} disabled={duplicateTemplateMutation.isPending}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                      <Button variant="outline" onClick={handleDelete} disabled={deleteTemplateMutation.isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                      <Button onClick={handleSave} disabled={saveTemplateMutation.isPending || !isDirty}>
                        {saveTemplateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                      <Button
                        className="bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
                        onClick={() => setApplyOpen(true)}
                        disabled={!hasTemplateContent({
                          ...draft,
                          goal_mileage_min: parseOptionalNumber(draft.goal_mileage_min),
                          goal_mileage_max: parseOptionalNumber(draft.goal_mileage_max),
                        })}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>

              </>
            )}
          </main>
        </div>

        {draft && (
          <div className="btc-panel mt-5 max-w-full overflow-x-auto">
            <div className="flex min-w-[1080px] w-full">
              {draft.days.map((day, index) => (
                <DayTemplateCard
                  key={day.day_of_week}
                  day={day}
                  shortDay={SHORT_DAYS[index]}
                  onChange={(nextDay) => updateDraftDay(index, nextDay)}
                />
              ))}
            </div>
          </div>
        )}
      </AppPage>

      <ApplyTemplateDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        athletes={athletes}
        template={draft ? {
          ...draft,
          goal_mileage_min: parseOptionalNumber(draft.goal_mileage_min),
          goal_mileage_max: parseOptionalNumber(draft.goal_mileage_max),
        } : null}
        isSubmitting={applyTemplateMutation.isPending}
        onApply={(payload) => applyTemplateMutation.mutate(payload)}
      />
    </div>
  );
}
