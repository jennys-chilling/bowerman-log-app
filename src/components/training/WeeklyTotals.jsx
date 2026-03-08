import React from 'react';
import { TrendingUp, Clock, Dumbbell, Activity } from "lucide-react";

export default function WeeklyTotals({ dayPlans }) {
  const calculateTotals = () => {
    let totalMileage = 0;
    let totalRunMinutes = 0;
    let totalXTrainMinutes = 0;
    let totalLifts = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    let highestDifficulty = 0;
    let highestDifficultyDay = '';
    
    dayPlans.forEach(day => {
      const countSession = (session) => {
        if (!session || !session.session_type) return;
        if (session.session_type === 'X-Train') {
          totalXTrainMinutes += session.duration_minutes || 0;
        } else if (session.session_type !== 'Off') {
          totalMileage += session.mileage || 0;
          totalRunMinutes += session.duration_minutes || 0;
        }
        if (session.rpe) { rpeSum += session.rpe; rpeCount++; }
      };

      // AM Session
      countSession(day.am_session);
      // PM Session
      countSession(day.pm_session);
      
      // Lift
      if (day.lift?.duration_minutes > 0) {
        totalLifts++;
      }
      
      // Difficulty
      if (day.planned_difficulty && day.planned_difficulty > highestDifficulty) {
        highestDifficulty = day.planned_difficulty;
        highestDifficultyDay = day.day_of_week;
      }
    });
    
    return {
      totalMileage: totalMileage.toFixed(1),
      totalRunTime: `${Math.floor(totalRunMinutes / 60)}h ${totalRunMinutes % 60}m`,
      totalXTrainTime: `${Math.floor(totalXTrainMinutes / 60)}h ${totalXTrainMinutes % 60}m`,
      totalLifts,
      avgRPE: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '-',
      highestDifficulty: highestDifficulty || '-',
      highestDifficultyDay: highestDifficultyDay || '-',
    };
  };
  
  const totals = calculateTotals();
  
  const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subValue && <div className="text-xs text-slate-400">{subValue}</div>}
    </div>
  );
  
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Weekly Totals</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={TrendingUp} label="Mileage" value={`${totals.totalMileage} mi`} color="text-blue-500" />
        <StatCard icon={Clock} label="Run Time" value={totals.totalRunTime} color="text-emerald-500" />
        <StatCard icon={Activity} label="X-Train" value={totals.totalXTrainTime} color="text-amber-500" />
        <StatCard icon={Dumbbell} label="Lifts" value={totals.totalLifts} color="text-purple-500" />
        <StatCard icon={Activity} label="Avg RPE" value={totals.avgRPE} color="text-orange-500" />
        <StatCard 
          icon={TrendingUp} 
          label="Hardest Day" 
          value={totals.highestDifficulty} 
          subValue={totals.highestDifficultyDay}
          color="text-red-500" 
        />
      </div>
    </div>
  );
}