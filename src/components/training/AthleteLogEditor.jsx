import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Sun, Moon, Dumbbell, X } from "lucide-react";

const defaultSession = {
  session_type: 'Run',
  duration_minutes: 0,
  mileage: 0,
  shoes: [],
  rpe: 5,
  comments: '',
};

function SessionForm({ session, onChange, toggleShoe, activeShoes }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={session.session_type} onValueChange={(v) => onChange('session_type', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy Run">Easy Run</SelectItem>
              <SelectItem value="Workout">Workout</SelectItem>
              <SelectItem value="Long Run">Long Run</SelectItem>
              <SelectItem value="Boost">Boost</SelectItem>
              <SelectItem value="X-Train">X-Train</SelectItem>
              <SelectItem value="Race">Race</SelectItem>
              <SelectItem value="Off">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            className="h-9"
            value={session.duration_minutes || ''}
            onChange={(e) => onChange('duration_minutes', parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Mileage</Label>
          <Input
            type="number"
            step="0.1"
            className="h-9"
            value={session.mileage || ''}
            onChange={(e) => onChange('mileage', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Shoes</Label>
        <div className="flex flex-wrap gap-2">
          {activeShoes.map(shoe => (
            <Badge
              key={shoe.id}
              variant={session.shoes?.includes(shoe.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleShoe(shoe.id)}
            >
              👟 {shoe.name}
              {session.shoes?.includes(shoe.id) && <X className="w-3 h-3 ml-1" />}
            </Badge>
          ))}
          {activeShoes.length === 0 && (
            <span className="text-xs text-slate-400">No active shoes. Add them in Shoe Inventory.</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">RPE (1-10): {session.rpe}</Label>
        <Slider
          value={[session.rpe || 5]}
          onValueChange={([v]) => onChange('rpe', v)}
          min={1} max={10} step={1}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Comments</Label>
        <Textarea
          value={session.comments || ''}
          onChange={(e) => onChange('comments', e.target.value)}
          placeholder="How did it feel?"
          rows={2}
        />
      </div>
    </div>
  );
}

export default function AthleteLogEditor({ open, onClose, dayPlan, date, onSave, shoes = [] }) {
  const [formData, setFormData] = useState({
    am_session: { ...defaultSession },
    pm_session: { ...defaultSession },
    lift: { duration_minutes: 0, lift_type: '' },
  });

  useEffect(() => {
    setFormData({
      am_session: dayPlan?.am_session ? { ...defaultSession, ...dayPlan.am_session } : { ...defaultSession },
      pm_session: dayPlan?.pm_session ? { ...defaultSession, ...dayPlan.pm_session } : { ...defaultSession },
      lift: dayPlan?.lift || { duration_minutes: 0, lift_type: '' },
    });
  }, [dayPlan, open]);

  const updateSession = (sessionKey, field, value) =>
    setFormData(f => ({ ...f, [sessionKey]: { ...f[sessionKey], [field]: value } }));

  const toggleShoe = (sessionKey, shoeId) => {
    const currentShoes = formData[sessionKey].shoes || [];
    const newShoes = currentShoes.includes(shoeId)
      ? currentShoes.filter(id => id !== shoeId)
      : [...currentShoes, shoeId];
    updateSession(sessionKey, 'shoes', newShoes);
  };

  const activeShoes = shoes.filter(s => s.status === 'Active');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Athlete Log:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="am" className="py-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="am" className="text-xs"><Sun className="w-3 h-3 mr-1" /> AM</TabsTrigger>
            <TabsTrigger value="pm" className="text-xs"><Moon className="w-3 h-3 mr-1" /> PM</TabsTrigger>
            <TabsTrigger value="lift" className="text-xs"><Dumbbell className="w-3 h-3 mr-1" /> Lift</TabsTrigger>
          </TabsList>

          <TabsContent value="am" className="mt-4">
            <SessionForm
              session={formData.am_session}
              onChange={(field, value) => updateSession('am_session', field, value)}
              toggleShoe={(shoeId) => toggleShoe('am_session', shoeId)}
              activeShoes={activeShoes}
            />
          </TabsContent>

          <TabsContent value="pm" className="mt-4">
            <SessionForm
              session={formData.pm_session}
              onChange={(field, value) => updateSession('pm_session', field, value)}
              toggleShoe={(shoeId) => toggleShoe('pm_session', shoeId)}
              activeShoes={activeShoes}
            />
          </TabsContent>

          <TabsContent value="lift" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Dumbbell className="w-4 h-4" />
                Lift Session
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    value={formData.lift.duration_minutes || ''}
                    onChange={(e) => setFormData(f => ({ ...f, lift: { ...f.lift, duration_minutes: parseInt(e.target.value) || 0 } }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Input
                    value={formData.lift.lift_type || ''}
                    onChange={(e) => setFormData(f => ({ ...f, lift: { ...f.lift, lift_type: e.target.value } }))}
                    placeholder="e.g., Upper body, Core..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}