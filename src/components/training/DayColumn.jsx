import React, { useState } from 'react';
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Sun, Moon, Dumbbell } from "lucide-react";
import DifficultyBadge from "./DifficultyBadge";

const workoutTypeColors = {
  'Easy Run': 'bg-sky-100 text-sky-700 border-sky-200',
  'Workout': 'bg-purple-100 text-purple-700 border-purple-200',
  'Long Run': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Boost': 'bg-teal-100 text-teal-700 border-teal-200',
  'X-Train': 'bg-amber-100 text-amber-700 border-amber-200',
  'Lift': 'bg-slate-100 text-slate-700 border-slate-200',
  'Off': 'bg-gray-100 text-gray-500 border-gray-200',
  'Race': 'bg-red-100 text-red-700 border-red-200',
};

export default function DayColumn({ date, dayPlan, onEdit, isCoach, shoes = [] }) {
  const today = isToday(date);
  const dayName = format(date, 'EEE');
  const dayNum = format(date, 'd');
  
  const getShoeNames = (shoeIds) => {
    if (!shoeIds || !shoeIds.length) return null;
    return shoeIds.map(id => {
      const shoe = shoes.find(s => s.id === id);
      return shoe?.name || 'Unknown';
    }).join(', ');
  };
  
  const SessionBlock = ({ session, label, icon: Icon }) => {
    if (!session || session.session_type === 'Off') return null;
    return (
      <div className="bg-white rounded-lg p-2 border border-slate-100 space-y-1">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {session.mileage > 0 && (
            <span className="font-semibold text-slate-800">{session.mileage} mi</span>
          )}
          {session.duration_minutes > 0 && (
            <span className="text-slate-600">{session.duration_minutes} min</span>
          )}
        </div>
        {session.rpe && (
          <div className="text-xs">
            <span className="text-slate-500">RPE:</span>
            <span className={cn(
              "ml-1 font-medium",
              session.rpe <= 3 ? "text-green-600" : 
              session.rpe <= 6 ? "text-amber-600" : "text-red-600"
            )}>{session.rpe}</span>
          </div>
        )}
        {getShoeNames(session.shoes) && (
          <div className="text-[10px] text-slate-400 truncate">
            👟 {getShoeNames(session.shoes)}
          </div>
        )}
        {session.comments && (
          <p className="text-[10px] text-slate-500 line-clamp-2 italic">{session.comments}</p>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn(
      "flex flex-col border-r border-slate-200 last:border-r-0 min-w-[140px]",
      today && "bg-amber-50/30"
    )}>
      {/* Day Header */}
      <div className={cn(
        "text-center py-2 border-b border-slate-200",
        today ? "bg-amber-100" : "bg-slate-50"
      )}>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{dayName}</div>
        <div className={cn(
          "text-lg font-bold",
          today ? "text-amber-700" : "text-slate-800"
        )}>{dayNum}</div>
      </div>
      
      {/* Coach Section */}
      <div className="bg-slate-50/80 p-2 border-b border-slate-200 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Coach</span>
          {isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'coach')}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {[['am_coach', Sun, 'AM'], ['pm_coach', Moon, 'PM']].map(([key, Icon, label]) => {
            const session = dayPlan?.[key];
            if (!session?.workout_type && !session?.prescription) return null;
            return (
              <div key={key} className="bg-white rounded-lg p-2 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                {session.workout_type && (
                  <Badge className={cn("text-[10px]", workoutTypeColors[session.workout_type])}>
                    {session.workout_type}
                  </Badge>
                )}
                {session.planned_difficulty > 0 && (
                  <DifficultyBadge level={session.planned_difficulty} size="sm" showLabel={false} />
                )}
                {session.prescription && (
                  <p className="text-[10px] text-slate-700 leading-snug">{session.prescription}</p>
                )}
                {session.coach_notes && (
                  <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-1">{session.coach_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Athlete Section */}
      <div className="bg-white p-2 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Athlete</span>
          {!isCoach && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(dayPlan, 'athlete')}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <SessionBlock session={dayPlan?.am_session} label="AM" icon={Sun} />
          <SessionBlock session={dayPlan?.pm_session} label="PM" icon={Moon} />
          
          {dayPlan?.lift?.duration_minutes > 0 && (
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Dumbbell className="w-3 h-3" />
                Lift
              </div>
              <div className="text-xs text-slate-700">
                {dayPlan.lift.duration_minutes} min
                {dayPlan.lift.lift_type && <span className="text-slate-500"> • {dayPlan.lift.lift_type}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}