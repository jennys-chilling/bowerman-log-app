import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, MessageSquare, CheckCircle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";

const AUTOSAVE_DELAY_MS = 1800;

function AutoExpandingTextarea({ value, isOpen, className, onChange, ...props }) {
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 112)}px`;
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const frame = window.requestAnimationFrame(resize);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, resize, value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        window.requestAnimationFrame(resize);
      }}
      className={cn("min-h-[7rem] resize-y overflow-hidden", className)}
      {...props}
    />
  );
}

function ReflectionCard({
  title,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  iconClassName,
  isOpen,
  onOpenChange,
}) {
  const hasText = value.trim().length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="self-start">
      <Card className={cn("btc-panel btc-role-zone overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            >
              <CardTitle className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <MessageSquare className={cn("h-4 w-4", iconClassName)} />
                {title}
              </CardTitle>
              <span className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {hasText ? 'Added' : 'Empty'}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-500 transition-transform dark:text-slate-400",
                    isOpen && "rotate-180"
                  )}
                />
              </span>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <AutoExpandingTextarea
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              isOpen={isOpen}
              rows={4}
              disabled={disabled}
              className={disabled ? 'bg-slate-50 dark:bg-slate-900' : ''}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function WeeklyReflection({ trainingWeek, onSave, isCoach }) {
  const [reflectionOpen, setReflectionOpen] = usePersistentBoolean('btc.weeklyReflection.athlete.open', true);
  const [feedbackOpen, setFeedbackOpen] = usePersistentBoolean('btc.weeklyReflection.coach.open', true);
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    const nextWeekKey = trainingWeek?.id || 'none';
    const isNewWeek = loadedWeekKeyRef.current !== nextWeekKey;

    if (hasUserEditedRef.current && !isNewWeek) {
      return;
    }

    setReflection(trainingWeek?.athlete_reflection || '');
    setFeedback(trainingWeek?.coach_feedback || '');
    loadedWeekKeyRef.current = nextWeekKey;
    editVersionRef.current = 0;
    markClean();
  }, [trainingWeek?.athlete_reflection, trainingWeek?.coach_feedback, trainingWeek?.id]);

  useEffect(() => {
    if (!trainingWeek?.id || !hasUserEdited) {
      return undefined;
    }

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const versionAtSave = editVersionRef.current;
      const payload = isCoach
        ? { coach_feedback: feedback }
        : { athlete_reflection: reflection };

      Promise.resolve(onSave(payload))
        .then(() => {
          if (editVersionRef.current === versionAtSave) {
            markClean();
          }
          showSaved();
        })
        .catch(() => {});
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(saveTimer.current);
  }, [feedback, hasUserEdited, isCoach, onSave, reflection, trainingWeek?.id]);

  const handleSave = async () => {
    window.clearTimeout(saveTimer.current);
    setSaving(true);
    const versionAtSave = editVersionRef.current;

    try {
      await onSave(isCoach
        ? { coach_feedback: feedback }
        : { athlete_reflection: reflection });
      if (editVersionRef.current === versionAtSave) {
        markClean();
      }
      showSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <ReflectionCard
        title="Athlete Reflection"
        value={reflection}
        onChange={(e) => {
          setReflection(e.target.value);
          markEdited();
        }}
        placeholder="How did the week feel? Any highs or lows?"
        disabled={isCoach}
        className="btc-role-zone-athlete"
        iconClassName="btc-stat-icon-primary"
        isOpen={reflectionOpen}
        onOpenChange={setReflectionOpen}
      />

      <ReflectionCard
        title="Coach Feedback"
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          markEdited();
        }}
        placeholder="Coach's notes and feedback for the week..."
        disabled={!isCoach}
        className="btc-role-zone-coach"
        iconClassName="btc-stat-icon-deep"
        isOpen={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
      
      <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Saved</>
          ) : saving ? (
            'Saving...'
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save</>
          )}
        </Button>
      </div>
    </div>
  );
}
