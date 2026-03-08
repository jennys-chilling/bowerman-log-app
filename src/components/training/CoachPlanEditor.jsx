import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Sun, Moon } from "lucide-react";
import DifficultyBadge from "./DifficultyBadge";

const WORKOUT_TYPES = ['Easy Run', 'Workout', 'Long Run', 'Boost', 'X-Train', 'Lift', 'Off', 'Race'];
const defaultSession = { workout_type: '', planned_difficulty: 5, prescription: '', coach_notes: '' };

function SessionForm({ session, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Workout Type</Label>
          <Select value={session.workout_type} onValueChange={(v) => onChange('workout_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Difficulty (1–9)</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[session.planned_difficulty || 5]}
              onValueChange={([v]) => onChange('planned_difficulty', v)}
              min={1} max={9} step={1} className="flex-1"
            />
            <DifficultyBadge level={session.planned_difficulty} size="sm" showLabel={false} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prescription</Label>
        <Textarea
          value={session.prescription || ''}
          onChange={(e) => onChange('prescription', e.target.value)}
          placeholder="e.g., 2 mi WU, 6x1000m @ 5K pace w/ 90s rest, 2 mi CD"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Coach Notes</Label>
        <Textarea
          value={session.coach_notes || ''}
          onChange={(e) => onChange('coach_notes', e.target.value)}
          placeholder="Additional instructions..."
          rows={2}
        />
      </div>
    </div>
  );
}

export default function CoachPlanEditor({ open, onClose, dayPlan, date, onSave }) {
  const [formData, setFormData] = useState({
    am_coach: { ...defaultSession },
    pm_coach: { ...defaultSession },
  });

  useEffect(() => {
    setFormData({
      am_coach: dayPlan?.am_coach ? { ...defaultSession, ...dayPlan.am_coach } : { ...defaultSession },
      pm_coach: dayPlan?.pm_coach ? { ...defaultSession, ...dayPlan.pm_coach } : { ...defaultSession },
    });
  }, [dayPlan, open]);

  const handleChange = (sessionKey, field, value) =>
    setFormData(f => ({ ...f, [sessionKey]: { ...f[sessionKey], [field]: value } }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Coach Plan:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="am" className="py-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="am" className="text-xs">
              <Sun className="w-3 h-3 mr-1" /> AM
            </TabsTrigger>
            <TabsTrigger value="pm" className="text-xs">
              <Moon className="w-3 h-3 mr-1" /> PM
            </TabsTrigger>
          </TabsList>
          <TabsContent value="am" className="mt-4">
            <SessionForm
              session={formData.am_coach}
              onChange={(field, value) => handleChange('am_coach', field, value)}
            />
          </TabsContent>
          <TabsContent value="pm" className="mt-4">
            <SessionForm
              session={formData.pm_coach}
              onChange={(field, value) => handleChange('pm_coach', field, value)}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}