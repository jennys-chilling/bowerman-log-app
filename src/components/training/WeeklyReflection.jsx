import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, MessageSquare, CheckCircle } from "lucide-react";

export default function WeeklyReflection({ trainingWeek, onSave, isCoach }) {
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  useEffect(() => {
    if (trainingWeek) {
      setReflection(trainingWeek.athlete_reflection || '');
      setFeedback(trainingWeek.coach_feedback || '');
    }
  }, [trainingWeek]);
  
  const handleSave = async () => {
    setSaving(true);
    await onSave({
      athlete_reflection: reflection,
      coach_feedback: feedback,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Athlete Reflection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How did the week feel? Any highs or lows?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={4}
            disabled={isCoach}
            className={isCoach ? 'bg-slate-50' : ''}
          />
        </CardContent>
      </Card>
      
      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Coach Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Coach's notes and feedback for the week..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            disabled={!isCoach}
            className={!isCoach ? 'bg-slate-50' : ''}
          />
        </CardContent>
      </Card>
      
      <div className="md:col-span-2 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Saved</>
          ) : saving ? (
            'Saving...'
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Reflections</>
          )}
        </Button>
      </div>
    </div>
  );
}