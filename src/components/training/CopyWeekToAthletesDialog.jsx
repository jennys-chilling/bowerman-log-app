import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const getDisplayName = (athlete = {}) => {
  const structuredName = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim();
  return structuredName || athlete.full_name || athlete.email;
};

const getInitials = (athlete = {}) => {
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.trim();
  return (initials || athlete.full_name?.[0] || athlete.email?.[0] || 'A').toUpperCase();
};

export default function CopyWeekToAthletesDialog({
  open,
  onClose,
  athletes,
  currentAthleteId,
  currentWeekStart,
  hasSourcePlan,
  isSubmitting,
  onCopy,
}) {
  const [selectedAthleteIds, setSelectedAthleteIds] = useState([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const targetAthletes = useMemo(
    () => athletes.filter((athlete) => athlete.role !== 'admin' && athlete.id !== currentAthleteId),
    [athletes, currentAthleteId]
  );

  useEffect(() => {
    if (!open) {
      setSelectedAthleteIds([]);
      setOverwriteExisting(false);
    }
  }, [open]);

  const allSelected = targetAthletes.length > 0 && selectedAthleteIds.length === targetAthletes.length;
  const weekLabel = currentWeekStart ? format(currentWeekStart, 'MMM d, yyyy') : '';

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

  const canCopy = selectedAthleteIds.length > 0 && hasSourcePlan && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-red-700 dark:text-red-300" />
            Copy Week to Athletes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Week of <span className="font-semibold text-slate-800 dark:text-slate-100">{weekLabel}</span>
          </div>

          {!hasSourcePlan && (
            <div className="btc-warning-panel flex gap-2 rounded-lg border px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Add at least one coach workout before copying this week.
            </div>
          )}

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

            {targetAthletes.length === 0 ? (
              <div className="rounded-lg border border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                No other athletes available.
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {targetAthletes.map((athlete) => {
                  const checked = selectedAthleteIds.includes(athlete.id);
                  return (
                    <label
                      key={athlete.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                    >
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleAthlete(athlete.id, Boolean(value))} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={athlete.profile_image_url} alt={getDisplayName(athlete)} className="object-cover" />
                        <AvatarFallback className="text-xs font-semibold">
                          {getInitials(athlete)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{getDisplayName(athlete)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
            <div>
              <Label htmlFor="overwrite-plans">Overwrite Existing Coach Plans</Label>
              {overwriteExisting && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">Existing target coach workouts will be replaced.</p>
              )}
            </div>
            <Switch id="overwrite-plans" checked={overwriteExisting} onCheckedChange={setOverwriteExisting} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onCopy({ athleteIds: selectedAthleteIds, overwriteExisting })}
            disabled={!canCopy}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Apply Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
