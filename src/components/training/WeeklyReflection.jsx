import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, MessageSquare, CheckCircle } from "lucide-react";
import FeedbackButton from "@/components/FeedbackButton";
import ThemeToggle from "@/components/ThemeToggle";

export default function WeeklyReflection({ trainingWeek, onSave, isCoach }) {
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (trainingWeek) {
      setReflection(trainingWeek.athlete_reflection || '');
      setFeedback(trainingWeek.coach_feedback || '');
      setHasUserEdited(false);
    }
  }, [trainingWeek]);

  const commitSave = async () => {
    await onSave({
      athlete_reflection: reflection,
      coach_feedback: feedback,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    if (!trainingWeek?.id || !hasUserEdited) {
      return undefined;
    }

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      commitSave();
    }, 900);

    return () => window.clearTimeout(saveTimer.current);
  }, [feedback, hasUserEdited, reflection, trainingWeek?.id]);

  const handleSave = async () => {
    window.clearTimeout(saveTimer.current);
    setSaving(true);
    await commitSave();
    setSaving(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-red-600" />
            Athlete Reflection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How did the week feel? Any highs or lows?"
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              setHasUserEdited(true);
            }}
            rows={4}
            disabled={isCoach}
            className={isCoach ? 'bg-slate-50 dark:bg-slate-900' : ''}
          />
        </CardContent>
      </Card>
      
      <Card className="border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Coach Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Coach's notes and feedback for the week..."
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              setHasUserEdited(true);
            }}
            rows={4}
            disabled={!isCoach}
            className={!isCoach ? 'bg-slate-50 dark:bg-slate-900' : ''}
          />
        </CardContent>
      </Card>
      
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FeedbackButton />
          <ThemeToggle />
        </div>
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
