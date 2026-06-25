import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/client';
import BrandMark from '@/components/BrandMark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRpeColorClasses } from '@/components/training/rpeColors';
import {
  getAthleteActivities,
  getCoachActivities,
  hasAthleteActivityData,
  hasCoachActivityData,
} from '@/components/training/sessionUtils';

const today = new Date();
const defaultStart = startOfWeek(addDays(today, -28), { weekStartsOn: 1 });

const getDisplayName = (athlete = {}) => {
  const structuredName = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim();
  return structuredName || athlete.full_name || athlete.email;
};

const getInitials = (athlete = {}) => {
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.trim();
  return (initials || athlete.full_name?.[0] || athlete.email?.[0] || 'A').toUpperCase();
};

const formatNumber = (value) => {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
};

const isWorkoutLabel = (value = '') => value.split(/\s+OR\s+/i).some((type) => type.trim() === 'Workout');

const collectWorkouts = (dayPlans = []) => dayPlans.flatMap((dayPlan) => {
  const athleteWorkouts = [
    ['AM', dayPlan.am_session],
    ['PM', dayPlan.pm_session],
  ].flatMap(([label, session]) => (
    getAthleteActivities(session)
      .filter(hasAthleteActivityData)
      .filter((activity) => isWorkoutLabel(activity.session_type))
      .map((activity) => ({ label, activity }))
  ));

  const coachWorkouts = [
    ['AM', dayPlan.am_coach],
    ['PM', dayPlan.pm_coach],
  ].flatMap(([label, session]) => (
    getCoachActivities(session)
      .filter(hasCoachActivityData)
      .filter((activity) => isWorkoutLabel(activity.workout_type))
      .map((activity) => ({ label, activity }))
  ));

  return athleteWorkouts.map((workout) => ({
    dayPlan,
    athleteLabel: workout.label,
    athleteActivity: workout.activity,
    coachMatches: coachWorkouts.filter((coachWorkout) => coachWorkout.label === workout.label),
  }));
});

export default function Workouts() {
  const [user, setUser] = useState(null);
  const [athleteId, setAthleteId] = useState(null);
  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

  useEffect(() => {
    appClient.auth.me().then((currentUser) => {
      setUser(currentUser);
      if (currentUser.role !== 'admin') {
        setAthleteId(currentUser.id);
      }
    });
  }, []);

  const isCoach = user?.role === 'admin';

  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => appClient.entities.User.list(),
    enabled: isCoach,
  });

  const athleteOptions = athletes.filter((athlete) => athlete.role !== 'admin');

  useEffect(() => {
    if (!isCoach || athleteId || athleteOptions.length === 0) return;
    setAthleteId(athleteOptions[0].id);
  }, [athleteId, athleteOptions, isCoach]);

  const selectedAthlete = isCoach ? athleteOptions.find((athlete) => athlete.id === athleteId) : user;

  const { data: dayPlans = [], isLoading } = useQuery({
    queryKey: ['workoutDayPlans', athleteId, startDate, endDate],
    queryFn: async () => {
      const allWeeks = await appClient.entities.TrainingWeek.filter({ athlete_id: athleteId });
      const relevantWeeks = allWeeks.filter((week) => week.week_start_date <= endDate && format(addDays(new Date(`${week.week_start_date}T00:00:00`), 6), 'yyyy-MM-dd') >= startDate);
      const dayPlanArrays = await Promise.all(
        relevantWeeks.map((week) => appClient.entities.DayPlan.filter({ training_week_id: week.id }))
      );
      return dayPlanArrays
        .flat()
        .filter((dayPlan) => dayPlan.date >= startDate && dayPlan.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!athleteId && !!startDate && !!endDate,
  });

  const workouts = useMemo(() => collectWorkouts(dayPlans), [dayPlans]);
  const totals = useMemo(() => {
    const mileage = workouts.reduce((sum, workout) => sum + (Number(workout.athleteActivity.mileage) || 0), 0);
    const minutes = workouts.reduce((sum, workout) => sum + (Number(workout.athleteActivity.duration_minutes) || 0), 0);
    const rpes = workouts
      .map((workout) => Number(workout.athleteActivity.rpe))
      .filter((rpe) => Number.isFinite(rpe) && rpe > 0);

    return {
      count: workouts.length,
      mileage,
      minutes,
      avgRpe: rpes.length ? rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length : null,
    };
  }, [workouts]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="btc-app-shell text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto max-w-6xl px-4 py-6">
        <div className="btc-rail-card mb-6 overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('TrainingLog')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <BrandMark title="Bowerman" subtitle="Workouts" compact />
            </div>

            {selectedAthlete && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedAthlete.profile_image_url} alt={getDisplayName(selectedAthlete)} />
                  <AvatarFallback className="text-xs font-semibold">{getInitials(selectedAthlete)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold">{getDisplayName(selectedAthlete)}</div>
                  {selectedAthlete.email && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <Mail className="h-3 w-3" />
                      {selectedAthlete.email}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
          {isCoach && (
            <div className="space-y-1">
              <Label>Athlete</Label>
              <Select value={athleteId || ''} onValueChange={setAthleteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {athleteOptions.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>{getDisplayName(athlete)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="workouts-start">Start</Label>
            <Input id="workouts-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="workouts-end">End</Label>
            <Input id="workouts-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Card className="border-slate-300 shadow-sm dark:border-slate-700">
            <CardContent className="p-4"><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Workouts</div><div className="text-2xl font-bold">{totals.count}</div></CardContent>
          </Card>
          <Card className="border-slate-300 shadow-sm dark:border-slate-700">
            <CardContent className="p-4"><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Miles</div><div className="text-2xl font-bold">{formatNumber(totals.mileage)}</div></CardContent>
          </Card>
          <Card className="border-slate-300 shadow-sm dark:border-slate-700">
            <CardContent className="p-4"><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Minutes</div><div className="text-2xl font-bold">{formatNumber(totals.minutes)}</div></CardContent>
          </Card>
          <Card className="border-slate-300 shadow-sm dark:border-slate-700">
            <CardContent className="p-4"><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Avg RPE</div><div className="text-2xl font-bold">{totals.avgRpe ? totals.avgRpe.toFixed(1) : '-'}</div></CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="rounded-xl border border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <Activity className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <div className="font-semibold">No workouts in this range</div>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout, index) => {
              const rpeColors = getRpeColorClasses(workout.athleteActivity.rpe);
              const splits = Array.isArray(workout.dayPlan.splits) ? workout.dayPlan.splits.filter((split) => split.distance || split.time || split.rest || split.notes) : [];

              return (
                <Card key={`${workout.dayPlan.id}-${workout.athleteLabel}-${index}`} className="overflow-hidden border-slate-300 shadow-sm dark:border-slate-700">
                  <CardHeader className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                      <span>{format(new Date(`${workout.dayPlan.date}T00:00:00`), 'EEE, MMM d, yyyy')} · {workout.athleteLabel}</span>
                      {workout.athleteActivity.rpe !== null && workout.athleteActivity.rpe !== undefined && (
                        <Badge className={cn("border", rpeColors.badge)}>RPE {workout.athleteActivity.rpe}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    {workout.coachMatches.length > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Coach Prescription</div>
                        <div className="space-y-2">
                          {workout.coachMatches.map((coachWorkout, coachIndex) => (
                            <div key={coachIndex} className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                              {coachWorkout.activity.prescription || coachWorkout.activity.workout_type}
                              {coachWorkout.activity.planned_difficulty && (
                                <span className="ml-2 font-semibold">RPE {coachWorkout.activity.planned_difficulty}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Mileage</div><div className="font-bold">{formatNumber(workout.athleteActivity.mileage)} mi</div></div>
                      <div><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Duration</div><div className="font-bold">{formatNumber(workout.athleteActivity.duration_minutes)} min</div></div>
                      <div><div className="text-xs uppercase text-slate-500 dark:text-slate-300">Type</div><div className="font-bold">{workout.athleteActivity.session_type}</div></div>
                    </div>

                    {workout.athleteActivity.comments?.trim() && (
                      <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                        {workout.athleteActivity.comments.trim()}
                      </div>
                    )}

                    {splits.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rep</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Rest</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {splits.map((split, splitIndex) => (
                            <TableRow key={splitIndex}>
                              <TableCell>{split.rep_number || splitIndex + 1}</TableCell>
                              <TableCell>{split.distance}</TableCell>
                              <TableCell>{split.time}</TableCell>
                              <TableCell>{split.rest}</TableCell>
                              <TableCell className="whitespace-pre-wrap">{split.notes}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
