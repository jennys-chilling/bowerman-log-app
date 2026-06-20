import React from 'react';
import { Activity, Bike, Clock, Dumbbell, Footprints, TrendingUp } from "lucide-react";
import { getAthleteActivities } from "./sessionUtils";

export default function WeeklyTotals({ dayPlans }) {
  const calculateTotals = () => {
    let totalMileage = 0;
    let totalRunMinutes = 0;
    let totalXTrainMinutes = 0;
    let totalLifts = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    let highestRpe = 0;
    let highestRpeDay = '';

    dayPlans.forEach((day) => {
      const countSession = (session) => {
        getAthleteActivities(session).forEach((activityRecord) => {
          if (!activityRecord.session_type) return;

          const duration = Number(activityRecord.duration_minutes) || 0;
          const mileage = Number(activityRecord.mileage) || 0;

          if (activityRecord.session_type === 'X-Train') {
            totalXTrainMinutes += duration;
          } else if (activityRecord.session_type !== 'Off') {
            totalMileage += mileage;
            totalRunMinutes += duration;
          }

          if (activityRecord.rpe !== null && activityRecord.rpe !== undefined) {
            const rpe = Number(activityRecord.rpe);
            rpeSum += rpe;
            rpeCount += 1;

            if (rpe > highestRpe) {
              highestRpe = rpe;
              highestRpeDay = day.day_of_week;
            }
          }
        });
      };

      countSession(day.am_session);
      countSession(day.pm_session);

      if (day.lift?.duration_minutes > 0) {
        totalLifts += 1;
      }
    });

    const formatTime = (minutes) => {
      const normalizedMinutes = Number(minutes) || 0;
      return `${Math.floor(normalizedMinutes / 60)}h ${normalizedMinutes % 60}m`;
    };

    return {
      totalMileage: totalMileage.toFixed(1),
      totalRunTime: formatTime(totalRunMinutes),
      totalXTrainTime: formatTime(totalXTrainMinutes),
      totalLifts,
      avgRPE: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '-',
      highestDifficulty: highestRpe || '-',
      highestDifficultyDay: highestRpeDay || '-',
    };
  };

  const totals = calculateTotals();

  const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
    <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {subValue && <div className="text-xs text-slate-400 dark:text-slate-500">{subValue}</div>}
    </div>
  );

  return (
    <div className="h-full rounded-xl border border-slate-300 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-950">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Weekly Totals</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard icon={Footprints} label="Mileage" value={`${totals.totalMileage} mi`} color="text-red-600" />
        <StatCard icon={Clock} label="Run Time" value={totals.totalRunTime} color="text-emerald-500" />
        <StatCard icon={Bike} label="X-Train" value={totals.totalXTrainTime} color="text-amber-500" />
        <StatCard icon={Dumbbell} label="Lifts" value={totals.totalLifts} color="text-red-800" />
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
