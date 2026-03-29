import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format, startOfMonth } from 'date-fns';
import WeekNavigation from '@/components/training/WeeklyNavigation';
import DayColumn from '@/components/training/DayColumn';
import WeeklyTotals from '@/components/training/WeeklyTotals';
import WeeklyReflection from '@/components/training/WeeklyReflection';
import CoachPlanEditor from '@/components/training/CoachPlanEditor';
import AthleteLogEditor from '@/components/training/AthleteLogEditor';
import SplitsEditor from '@/components/training/SplitsEditor';
import MonthView from '@/components/training/MonthView';
import { DifficultyKey } from '@/components/training/DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList, User, Users, CalendarDays, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TrainingLog() {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [user, setUser] = useState(null);
  const [viewingAthleteId, setViewingAthleteId] = useState(null);
  const [editorState, setEditorState] = useState({
    coachEditor: false,
    athleteEditor: false,
    splitsEditor: false,
    selectedDay: null,
    selectedDayPlan: null,
  });
  
  useEffect(() => {
    appClient.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        setViewingAthleteId(u.id);
      }
    });
  }, []);
  
  const isCoach = user?.role === 'admin';
  const effectiveAthleteId = viewingAthleteId || user?.id;
  
  // Fetch athletes for coach
  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => appClient.entities.User.list(),
    enabled: isCoach,
  });
  
  // Fetch training week
  const { data: trainingWeeks = [], isLoading: loadingWeek } = useQuery({
    queryKey: ['trainingWeek', effectiveAthleteId, format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: () => appClient.entities.TrainingWeek.filter({
      athlete_id: effectiveAthleteId,
      week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
    }),
    enabled: !!effectiveAthleteId,
  });
  
  const trainingWeek = trainingWeeks[0];
  
  // Fetch day plans
  const { data: dayPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['dayPlans', trainingWeek?.id],
    queryFn: () => appClient.entities.DayPlan.filter({ training_week_id: trainingWeek.id }),
    enabled: !!trainingWeek?.id,
  });
  
  // Fetch all training weeks for month view
  const { data: monthWeeks = [] } = useQuery({
    queryKey: ['monthWeeks', effectiveAthleteId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const allWeeks = await appClient.entities.TrainingWeek.filter({ athlete_id: effectiveAthleteId });
      const monthStr = format(currentMonth, 'yyyy-MM');
      return allWeeks.filter(w => w.week_start_date && w.week_start_date.startsWith(monthStr.slice(0, 7)));
    },
    enabled: !!effectiveAthleteId && viewMode === 'month',
  });

  // Fetch all day plans for the month
  const { data: monthDayPlans = [], isLoading: loadingMonthPlans } = useQuery({
    queryKey: ['monthDayPlans', effectiveAthleteId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startStr = format(new Date(year, month - 1, 22), 'yyyy-MM-dd');
      const endStr = format(new Date(year, month + 1, 10), 'yyyy-MM-dd');
      const allWeeks = await appClient.entities.TrainingWeek.filter({ athlete_id: effectiveAthleteId });
      const relevantWeeks = allWeeks.filter(w => w.week_start_date >= startStr && w.week_start_date <= endStr);
      const plansArrays = await Promise.all(
        relevantWeeks.map(w => appClient.entities.DayPlan.filter({ training_week_id: w.id }))
      );
      return plansArrays.flat();
    },
    enabled: !!effectiveAthleteId && viewMode === 'month',
  });

  // Build a date-keyed map of day plans for month view
  const monthDayPlanMap = React.useMemo(() => {
    const map = {};
    monthDayPlans.forEach(dp => { if (dp.date) map[dp.date] = dp; });
    return map;
  }, [monthDayPlans]);

  // Fetch shoes
  const { data: shoes = [] } = useQuery({
    queryKey: ['shoes', effectiveAthleteId],
    queryFn: () => appClient.entities.Shoe.filter({ athlete_id: effectiveAthleteId }),
    enabled: !!effectiveAthleteId,
  });
  
  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: async () => {
      const week = await appClient.entities.TrainingWeek.create({
        athlete_id: effectiveAthleteId,
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      });
      // Create day plans for each day
      const dayPlansData = DAYS.map((day, index) => ({
        training_week_id: week.id,
        date: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
        day_of_week: day,
      }));
      await appClient.entities.DayPlan.bulkCreate(dayPlansData);
      return week;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] });
    },
  });
  
  // Update day plan mutation
  const updateDayPlanMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.DayPlan.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dayPlans'] }),
  });
  
  // Update week mutation
  const updateWeekMutation = useMutation({
    mutationFn: (data) => appClient.entities.TrainingWeek.update(trainingWeek.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainingWeek'] }),
  });
  
  // Update shoe mileage after session save
  const updateShoeMileageMutation = useMutation({
    mutationFn: async ({ shoeIds, mileage }) => {
      for (const shoeId of shoeIds) {
        const shoe = shoes.find(s => s.id === shoeId);
        if (shoe) {
          await appClient.entities.Shoe.update(shoeId, {
            current_mileage: (shoe.current_mileage || 0) + mileage,
          });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shoes'] }),
  });
  
  const handleEditDay = (dayPlan, mode) => {
    const dayDate = dayPlan?.date 
      ? new Date(dayPlan.date) 
      : addDays(currentWeekStart, DAYS.indexOf(dayPlan?.day_of_week || 'Monday'));
    
    setEditorState({
      coachEditor: mode === 'coach',
      athleteEditor: mode === 'athlete',
      splitsEditor: false,
      selectedDay: dayDate,
      selectedDayPlan: dayPlan,
    });
  };
  
  const handleSaveCoachPlan = async (data) => {
    if (editorState.selectedDayPlan?.id) {
      await updateDayPlanMutation.mutateAsync({
        id: editorState.selectedDayPlan.id,
        data,
      });
    }
    setEditorState({ ...editorState, coachEditor: false });
  };
  
  const handleSaveAthleteLog = async (data) => {
    const dayPlan = editorState.selectedDayPlan;
    if (dayPlan?.id) {
      // Calculate mileage difference for shoes
      const oldAm = dayPlan.am_session || {};
      const oldPm = dayPlan.pm_session || {};
      const newAm = data.am_session || {};
      const newPm = data.pm_session || {};
      
      // Update shoe mileage for new shoes
      if (newAm.shoes?.length && newAm.mileage) {
        await updateShoeMileageMutation.mutateAsync({
          shoeIds: newAm.shoes.filter(s => !oldAm.shoes?.includes(s)),
          mileage: newAm.mileage,
        });
      }
      if (newPm.shoes?.length && newPm.mileage) {
        await updateShoeMileageMutation.mutateAsync({
          shoeIds: newPm.shoes.filter(s => !oldPm.shoes?.includes(s)),
          mileage: newPm.mileage,
        });
      }
      
      await updateDayPlanMutation.mutateAsync({ id: dayPlan.id, data });
    }
    setEditorState({ ...editorState, athleteEditor: false });
  };
  
  const handleSaveSplits = async (splits) => {
    if (editorState.selectedDayPlan?.id) {
      await updateDayPlanMutation.mutateAsync({
        id: editorState.selectedDayPlan.id,
        data: { splits },
      });
    }
    setEditorState({ ...editorState, splitsEditor: false });
  };
  
  const getDayPlanForDate = (dayIndex) => {
    const dateStr = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd');
    return dayPlans.find(dp => dp.date === dateStr);
  };
  
  const loading = loadingWeek || loadingPlans;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              Training Log
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isCoach ? 'Coach View' : 'Athlete View'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <DifficultyKey />
            <Link to={createPageUrl('ShoeInventory')}>
              <Button variant="outline" size="sm">
                👟 Shoes
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Coach Athlete Selector */}
        {isCoach && athletes.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <Users className="w-4 h-4" /> Viewing:
            </span>
            <div className="flex gap-2 flex-wrap">
              {athletes.filter(a => a.role !== 'admin').map(athlete => (
                <Badge
                  key={athlete.id}
                  variant={viewingAthleteId === athlete.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setViewingAthleteId(athlete.id)}
                >
                  <User className="w-3 h-3 mr-1" />
                  {athlete.full_name || athlete.email}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* View Toggle + Navigation */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none px-4 ${viewMode === 'week' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setViewMode('week')}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none px-4 ${viewMode === 'month' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setViewMode('month')}
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Month
            </Button>
          </div>
        </div>

        {viewMode === 'week' && (
          <WeekNavigation 
            currentWeekStart={currentWeekStart} 
            onWeekChange={setCurrentWeekStart} 
          />
        )}
        
        {/* Main Content */}
        {viewMode === 'month' ? (
          loadingMonthPlans ? (
            <div className="mt-8 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <MonthView
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              allDayPlans={monthDayPlanMap}
              onWeekClick={(weekStart) => {
                setCurrentWeekStart(weekStart);
                setViewMode('week');
              }}
            />
          )
        ) : loading ? (
          <div className="mt-8 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : !trainingWeek ? (
          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-12 text-center">
            <h3 className="text-lg font-medium text-slate-700 mb-2">No training week found</h3>
            <p className="text-slate-500 mb-4">Create a training week to start planning.</p>
            <Button onClick={() => createWeekMutation.mutate()} disabled={createWeekMutation.isPending}>
              {createWeekMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Create Training Week
            </Button>
          </div>
        ) : (
          <>
            {/* Weekly Grid */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="flex min-w-[980px]">
                  {DAYS.map((day, index) => (
                    <DayColumn
                      key={day}
                      date={addDays(currentWeekStart, index)}
                      dayPlan={getDayPlanForDate(index)}
                      onEdit={handleEditDay}
                      isCoach={isCoach}
                      shoes={shoes}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Weekly Totals */}
            <div className="mt-6">
              <WeeklyTotals dayPlans={dayPlans} />
            </div>
            
            {/* Weekly Reflection */}
            <div className="mt-6">
              <WeeklyReflection
                trainingWeek={trainingWeek}
                onSave={(data) => updateWeekMutation.mutate(data)}
                isCoach={isCoach}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Editors */}
      <CoachPlanEditor
        open={editorState.coachEditor}
        onClose={() => setEditorState({ ...editorState, coachEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveCoachPlan}
      />
      
      <AthleteLogEditor
        open={editorState.athleteEditor}
        onClose={() => setEditorState({ ...editorState, athleteEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveAthleteLog}
        shoes={shoes}
      />
      
      <SplitsEditor
        open={editorState.splitsEditor}
        onClose={() => setEditorState({ ...editorState, splitsEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveSplits}
      />
    </div>
  );
}
