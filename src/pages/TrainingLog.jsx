import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import WeekNavigation from '@/components/training/WeeklyNavigation';
import { useAuth } from '@/lib/AuthContext';
import DayColumn from '@/components/training/DayColumn';
import WeeklyTotals from '@/components/training/WeeklyTotals';
import WeeklyReflection from '@/components/training/WeeklyReflection';
import WeeklyMileageGoal from '@/components/training/WeeklyMileageGoal';
import CoachPlanEditor from '@/components/training/CoachPlanEditor';
import AthleteLogEditor from '@/components/training/AthleteLogEditor';
import SplitsEditor from '@/components/training/SplitsEditor';
import MonthView from '@/components/training/MonthView';
import CopyWeekToAthletesDialog from '@/components/training/CopyWeekToAthletesDialog';
import BrandMark from '@/components/BrandMark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Users, CalendarDays, Calendar, LogOut, Footprints, UserCircle, Mail, Phone, Copy, Layers, Check, ChevronsUpDown, Activity, Settings } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  countsAsRunMileage,
  getAthleteActivities,
  getCoachActivities,
  hasCoachLiftData,
  hasCoachSessionData,
  makeCoachSession,
  sanitizeCoachLift,
} from '@/components/training/sessionUtils';
import {
  TRAINING_FACTOR_OPTIONS,
  normalizeTrainingFactorPreferences,
} from '@/components/training/trainingFactors';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getDisplayName = (athlete = {}) => {
  const structuredName = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim();
  return structuredName || athlete.full_name || athlete.email;
};

const getInitials = (athlete = {}) => {
  const initials = `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.trim();
  return (initials || athlete.full_name?.[0] || athlete.email?.[0] || 'A').toUpperCase();
};

const hasCoachDayContent = (dayPlan = {}) => (
  hasCoachSessionData(dayPlan.am_coach) ||
  hasCoachSessionData(dayPlan.pm_coach) ||
  hasCoachLiftData(dayPlan.lift_coach)
);

const normalizeCoachSession = (session = {}) => makeCoachSession(getCoachActivities(session));

const getShoeMileageById = (session = {}) => {
  const mileageByShoe = new Map();

  getAthleteActivities(session).forEach((activity) => {
    const mileage = Number(activity.mileage) || 0;
    if (!countsAsRunMileage(activity.session_type) || mileage === 0) return;

    const splits = Object.entries(activity.shoe_mileage || {})
      .map(([shoeId, shoeMileage]) => [shoeId, Number(shoeMileage) || 0])
      .filter(([, shoeMileage]) => shoeMileage > 0);

    if (splits.length > 0) {
      splits.forEach(([shoeId, shoeMileage]) => {
        mileageByShoe.set(shoeId, (mileageByShoe.get(shoeId) || 0) + shoeMileage);
      });
      return;
    }

    (activity.shoes || []).forEach((shoeId) => {
      mileageByShoe.set(shoeId, (mileageByShoe.get(shoeId) || 0) + mileage);
    });
  });

  return mileageByShoe;
};

const combineShoeMileageMaps = (...maps) => {
  const combined = new Map();

  maps.forEach((map) => {
    map.forEach((mileage, shoeId) => {
      combined.set(shoeId, (combined.get(shoeId) || 0) + mileage);
    });
  });

  return combined;
};

const getCurrentWeekStart = () => startOfWeek(new Date(), { weekStartsOn: 1 });

const parseDateParam = (value, fallback) => {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
};

const parseViewModeParam = (value) => (value === 'month' ? 'month' : 'week');

const parseRangeWeeksParam = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
};

const isDuplicateKeyError = (error) => (
  error?.code === '23505' ||
  error?.message?.toLowerCase().includes('duplicate key')
);

const getTrainingFactorSettingsErrorMessage = (error) => {
  const message = error?.message || 'Could not save training factor settings.';

  if (message.includes('training_factor_preferences')) {
    return 'Could not save training factor settings because the Supabase profiles.training_factor_preferences column is missing. Run the latest schema SQL, then try again.';
  }

  return message;
};

export default function TrainingLog() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWeekStart = parseDateParam(searchParams.get('week'), getCurrentWeekStart());
  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart);
  const [viewMode, setViewMode] = useState(() => parseViewModeParam(searchParams.get('view'))); // 'week' | 'month'
  const [rangeStart, setRangeStart] = useState(() => parseDateParam(searchParams.get('rangeStart'), initialWeekStart));
  const [rangeWeeks, setRangeWeeks] = useState(() => parseRangeWeeksParam(searchParams.get('rangeWeeks')));
  const [user, setUser] = useState(null);
  const [viewingAthleteId, setViewingAthleteId] = useState(() => searchParams.get('athlete'));
  const [athleteSelectorOpen, setAthleteSelectorOpen] = useState(false);
  const [editorState, setEditorState] = useState({
    coachEditor: false,
    athleteEditor: false,
    splitsEditor: false,
    selectedDay: null,
    selectedDayPlan: null,
  });
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [factorSettingsOpen, setFactorSettingsOpen] = useState(false);
  const [factorDraftKeys, setFactorDraftKeys] = useState([]);
  
  useEffect(() => {
    appClient.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        setViewingAthleteId(u.id);
      }
    });
  }, []);
  
  const isCoach = user?.role === 'admin';
  const effectiveAthleteId = user ? (isCoach ? viewingAthleteId : user.id) : null;
  const activeTrainingFactorKeys = React.useMemo(
    () => normalizeTrainingFactorPreferences(user?.training_factor_preferences),
    [user?.training_factor_preferences]
  );
  const activeTrainingFactorOptions = React.useMemo(
    () => TRAINING_FACTOR_OPTIONS.filter((option) => activeTrainingFactorKeys.includes(option.key)),
    [activeTrainingFactorKeys]
  );
  const logContextSearch = React.useMemo(() => {
    const params = new URLSearchParams();

    if (effectiveAthleteId) {
      params.set('athlete', effectiveAthleteId);
    }
    params.set('week', format(currentWeekStart, 'yyyy-MM-dd'));
    params.set('view', viewMode);
    params.set('rangeStart', format(rangeStart, 'yyyy-MM-dd'));
    params.set('rangeWeeks', String(rangeWeeks));

    return params.toString();
  }, [currentWeekStart, effectiveAthleteId, rangeStart, rangeWeeks, viewMode]);

  const getPageUrlWithLogContext = React.useCallback((pageName) => (
    `${createPageUrl(pageName)}${logContextSearch ? `?${logContextSearch}` : ''}`
  ), [logContextSearch]);

  useEffect(() => {
    if (!user) return;
    if (searchParams.toString() !== logContextSearch) {
      setSearchParams(logContextSearch, { replace: true });
    }
  }, [logContextSearch, searchParams, setSearchParams, user]);

  useEffect(() => {
    if (!factorSettingsOpen) return;
    setFactorDraftKeys(activeTrainingFactorKeys);
  }, [activeTrainingFactorKeys, factorSettingsOpen]);
  
  // Fetch athletes for coach
  const { data: athletes = [] } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => appClient.entities.User.list(),
    enabled: isCoach,
  });

  const athleteOptions = React.useMemo(
    () => athletes.filter((athlete) => athlete.role !== 'admin'),
    [athletes]
  );

  useEffect(() => {
    if (!isCoach || athleteOptions.length === 0) return;
    if (viewingAthleteId && athleteOptions.some((athlete) => athlete.id === viewingAthleteId)) return;

    setViewingAthleteId(athleteOptions[0].id);
  }, [athleteOptions, isCoach, viewingAthleteId]);

  const selectedAthlete = athleteOptions.find(athlete => athlete.id === effectiveAthleteId);
  
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
  const hasSourceCoachPlan = dayPlans.some(hasCoachDayContent);
  
  const rangeEnd = React.useMemo(() => addDays(rangeStart, (rangeWeeks * 7) - 1), [rangeStart, rangeWeeks]);

  // Fetch all training weeks for the selected month/range view
  const { data: monthTrainingWeeks = [], isLoading: loadingMonthWeeks } = useQuery({
    queryKey: ['monthTrainingWeeks', effectiveAthleteId, format(rangeStart, 'yyyy-MM-dd'), rangeWeeks],
    queryFn: async () => {
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');
      const allWeeks = await appClient.entities.TrainingWeek.filter({ athlete_id: effectiveAthleteId });
      return allWeeks.filter((week) => week.week_start_date >= startStr && week.week_start_date <= endStr);
    },
    enabled: !!effectiveAthleteId && viewMode === 'month',
  });

  // Fetch all day plans for the selected week range
  const { data: monthDayPlans = [], isLoading: loadingMonthPlans } = useQuery({
    queryKey: ['monthDayPlans', effectiveAthleteId, format(rangeStart, 'yyyy-MM-dd'), rangeWeeks],
    queryFn: async () => {
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');
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

  const monthTrainingWeekMap = React.useMemo(() => {
    const map = {};
    monthTrainingWeeks.forEach((week) => { if (week.week_start_date) map[week.week_start_date] = week; });
    return map;
  }, [monthTrainingWeeks]);

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
      queryClient.invalidateQueries({ queryKey: ['monthDayPlans'] });
      queryClient.invalidateQueries({ queryKey: ['monthTrainingWeeks'] });
    },
  });
  
  // Update day plan mutation
  const updateDayPlanMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.DayPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] });
      queryClient.invalidateQueries({ queryKey: ['monthDayPlans'] });
    },
  });
  
  // Update week mutation
  const updateWeekMutation = useMutation({
    mutationFn: (data) => appClient.entities.TrainingWeek.update(trainingWeek.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingWeek'] });
      queryClient.invalidateQueries({ queryKey: ['monthTrainingWeeks'] });
    },
  });

  const updateTrainingFactorSettingsMutation = useMutation({
    mutationFn: (keys) => {
      if (!user?.id) {
        throw new Error('Sign in before updating training factor settings.');
      }

      return appClient.entities.User.update(user.id, {
        training_factor_preferences: normalizeTrainingFactorPreferences(keys),
      });
    },
    onSuccess: (updatedUser) => {
      setUser((currentUser) => ({ ...(currentUser || {}), ...updatedUser }));
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      setFactorSettingsOpen(false);
      toast({ title: 'Training factors updated' });
    },
    onError: (error) => {
      toast({
        title: 'Settings not saved',
        description: getTrainingFactorSettingsErrorMessage(error),
        variant: 'destructive',
      });
    },
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

  const copyWeekMutation = useMutation({
    mutationFn: async ({ athleteIds, overwriteExisting }) => {
      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      const sourceByDate = new Map(dayPlans.map((dayPlan) => [dayPlan.date, dayPlan]));
      const sourceWeekGoal = {
        goal_mileage_min: trainingWeek?.goal_mileage_min ?? null,
        goal_mileage_max: trainingWeek?.goal_mileage_max ?? null,
      };
      const hasSourceWeekGoal = sourceWeekGoal.goal_mileage_min !== null || sourceWeekGoal.goal_mileage_max !== null;
      let updatedDays = 0;

      const ensureTargetWeek = async (athleteId) => {
        const existingWeeks = await appClient.entities.TrainingWeek.filter({
          athlete_id: athleteId,
          week_start_date: weekStartDate,
        });

        const week = existingWeeks[0] || await appClient.entities.TrainingWeek.create({
          athlete_id: athleteId,
          week_start_date: weekStartDate,
        });

        const existingDayPlans = await appClient.entities.DayPlan.filter({ training_week_id: week.id });
        const existingByDate = new Map(existingDayPlans.map((dayPlan) => [dayPlan.date, dayPlan]));
        const missingDayPlans = DAYS
          .map((day, index) => ({
            training_week_id: week.id,
            date: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
            day_of_week: day,
          }))
          .filter((dayPlan) => !existingByDate.has(dayPlan.date));

        const createdDayPlans = missingDayPlans.length
          ? await appClient.entities.DayPlan.bulkCreate(missingDayPlans)
          : [];

        return {
          week,
          dayPlansByDate: new Map(
            [...existingDayPlans, ...createdDayPlans].map((dayPlan) => [dayPlan.date, dayPlan])
          ),
        };
      };

      for (const athleteId of athleteIds) {
        const { week: targetWeek, dayPlansByDate: targetByDate } = await ensureTargetWeek(athleteId);

        if (
          hasSourceWeekGoal &&
          (
            overwriteExisting ||
            (
              (targetWeek.goal_mileage_min === null || targetWeek.goal_mileage_min === undefined) &&
              (targetWeek.goal_mileage_max === null || targetWeek.goal_mileage_max === undefined)
            )
          )
        ) {
          await appClient.entities.TrainingWeek.update(targetWeek.id, sourceWeekGoal);
        }

        for (const dayIndex of DAYS.keys()) {
          const date = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd');
          const sourceDayPlan = sourceByDate.get(date);
          const targetDayPlan = targetByDate.get(date);

          if (!sourceDayPlan || !targetDayPlan) {
            continue;
          }

          const sourceAmCoach = normalizeCoachSession(sourceDayPlan.am_coach);
          const sourcePmCoach = normalizeCoachSession(sourceDayPlan.pm_coach);
          const sourceLiftCoach = sanitizeCoachLift(sourceDayPlan.lift_coach);
          const data = {};

          if (overwriteExisting) {
            data.am_coach = sourceAmCoach;
            data.pm_coach = sourcePmCoach;
            data.lift_coach = sourceLiftCoach;
          } else {
            if (hasCoachSessionData(sourceAmCoach) && !hasCoachSessionData(targetDayPlan.am_coach)) {
              data.am_coach = sourceAmCoach;
            }
            if (hasCoachSessionData(sourcePmCoach) && !hasCoachSessionData(targetDayPlan.pm_coach)) {
              data.pm_coach = sourcePmCoach;
            }
            if (hasCoachLiftData(sourceLiftCoach) && !hasCoachLiftData(targetDayPlan.lift_coach)) {
              data.lift_coach = sourceLiftCoach;
            }
          }

          if (Object.keys(data).length > 0) {
            await appClient.entities.DayPlan.update(targetDayPlan.id, data);
            updatedDays += 1;
          }
        }
      }

      return {
        athleteCount: athleteIds.length,
        updatedDays,
      };
    },
    onSuccess: ({ athleteCount, updatedDays }) => {
      queryClient.invalidateQueries({ queryKey: ['trainingWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dayPlans'] });
      queryClient.invalidateQueries({ queryKey: ['monthWeeks'] });
      queryClient.invalidateQueries({ queryKey: ['monthDayPlans'] });
      queryClient.invalidateQueries({ queryKey: ['monthTrainingWeeks'] });
      setCopyDialogOpen(false);
      toast({
        title: 'Week copied',
        description: `Applied coach plans to ${athleteCount} athlete${athleteCount === 1 ? '' : 's'} across ${updatedDays} day${updatedDays === 1 ? '' : 's'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Copy failed',
        description: error.message || 'Could not copy this week.',
        variant: 'destructive',
      });
    },
  });
  
  const handleEditDay = (dayPlan, mode) => {
    const dayDate = dayPlan?.date 
      ? parseISO(dayPlan.date)
      : addDays(currentWeekStart, DAYS.indexOf(dayPlan?.day_of_week || 'Monday'));
    
    setEditorState({
      coachEditor: mode === 'coach',
      athleteEditor: mode === 'athlete',
      splitsEditor: false,
      selectedDay: dayDate,
      selectedDayPlan: dayPlan,
    });
  };

  const getOrCreateTrainingWeek = async (athleteId, weekStartDate) => {
    const existingWeeks = await appClient.entities.TrainingWeek.filter({
      athlete_id: athleteId,
      week_start_date: weekStartDate,
    });

    if (existingWeeks[0]) {
      return existingWeeks[0];
    }

    try {
      return await appClient.entities.TrainingWeek.create({
        athlete_id: athleteId,
        week_start_date: weekStartDate,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const reloadedWeeks = await appClient.entities.TrainingWeek.filter({
        athlete_id: athleteId,
        week_start_date: weekStartDate,
      });
      if (reloadedWeeks[0]) {
        return reloadedWeeks[0];
      }

      throw error;
    }
  };

  const getOrCreateDayPlan = async (week, date, weekStart) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDayPlans = await appClient.entities.DayPlan.filter({ training_week_id: week.id });
    const existingDayPlan = existingDayPlans.find((dayPlan) => dayPlan.date === dateStr);

    if (existingDayPlan) {
      return existingDayPlan;
    }

    const dayIndex = Math.max(0, Math.min(6, differenceInCalendarDays(date, weekStart)));

    try {
      return await appClient.entities.DayPlan.create({
        training_week_id: week.id,
        date: dateStr,
        day_of_week: DAYS[dayIndex],
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const reloadedDayPlans = await appClient.entities.DayPlan.filter({ training_week_id: week.id });
      const reloadedDayPlan = reloadedDayPlans.find((dayPlan) => dayPlan.date === dateStr);
      if (reloadedDayPlan) {
        return reloadedDayPlan;
      }

      throw error;
    }
  };

  const ensureDayPlanForDate = async (date) => {
    if (!effectiveAthleteId) {
      throw new Error('Select an athlete before editing.');
    }

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekStartDate = format(weekStart, 'yyyy-MM-dd');
    const week = await getOrCreateTrainingWeek(effectiveAthleteId, weekStartDate);
    const dayPlan = await getOrCreateDayPlan(week, date, weekStart);

    queryClient.invalidateQueries({ queryKey: ['trainingWeek'] });
    queryClient.invalidateQueries({ queryKey: ['dayPlans'] });
    queryClient.invalidateQueries({ queryKey: ['monthDayPlans'] });
    queryClient.invalidateQueries({ queryKey: ['monthTrainingWeeks'] });

    return dayPlan;
  };

  const handleMonthEditDay = async ({ date, dayPlan }) => {
    if (!isCoach) return;

    const dayDate = startOfWeek(date, { weekStartsOn: 1 });
    setCurrentWeekStart(dayDate);

    try {
      const resolvedDayPlan = dayPlan || await ensureDayPlanForDate(date);

      setEditorState({
        coachEditor: true,
        athleteEditor: false,
        splitsEditor: false,
        selectedDay: date,
        selectedDayPlan: resolvedDayPlan,
      });
    } catch (error) {
      toast({
        title: 'Could not open day',
        description: error.message || 'Could not create the day plan for editing.',
        variant: 'destructive',
      });
    }
  };
  
  const getSaveErrorMessage = (error) => {
    const message = error?.message || 'Could not save this coach plan.';
    if (message.includes('lift_coach')) {
      return 'Could not save lift plans because the Supabase day_plans.lift_coach column is missing. Run the latest schema SQL, then try again.';
    }
    if (message.includes('goal_mileage')) {
      return 'Could not save weekly mileage goals because the latest Supabase schema has not been applied yet.';
    }
    if (message.includes('training_factors')) {
      return 'Could not save training factors because the Supabase day_plans.training_factors column is missing. Run the latest schema SQL, then try again.';
    }

    return message;
  };

  const persistCoachPlan = async (data, { closeEditor = false, showErrors = false } = {}) => {
    try {
      if (editorState.selectedDayPlan?.id) {
        await updateDayPlanMutation.mutateAsync({
          id: editorState.selectedDayPlan.id,
          data,
        });
      }
      if (closeEditor) {
        setEditorState((current) => ({ ...current, coachEditor: false }));
      }
    } catch (error) {
      if (showErrors) {
        toast({
          title: 'Save failed',
          description: getSaveErrorMessage(error),
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveCoachPlan = (data) => persistCoachPlan(data, { closeEditor: true, showErrors: true });
  const handleAutoSaveCoachPlan = (data) => persistCoachPlan(data);

  const persistAthleteLog = async (data, { closeEditor = false, updateShoes = false, showErrors = false } = {}) => {
    try {
      const dayPlan = editorState.selectedDayPlan;
      if (dayPlan?.id) {
        if (updateShoes) {
          const oldShoeMileage = combineShoeMileageMaps(
            getShoeMileageById(dayPlan.am_session),
            getShoeMileageById(dayPlan.pm_session)
          );
          const newShoeMileage = combineShoeMileageMaps(
            getShoeMileageById(data.am_session),
            getShoeMileageById(data.pm_session)
          );
          const shoeIds = new Set([...oldShoeMileage.keys(), ...newShoeMileage.keys()]);

          for (const shoeId of shoeIds) {
            const mileageDelta = (newShoeMileage.get(shoeId) || 0) - (oldShoeMileage.get(shoeId) || 0);
            if (mileageDelta !== 0) {
              await updateShoeMileageMutation.mutateAsync({
                shoeIds: [shoeId],
                mileage: mileageDelta,
              });
            }
          }
        }

        await updateDayPlanMutation.mutateAsync({ id: dayPlan.id, data });
      }

      if (closeEditor) {
        setEditorState({ ...editorState, athleteEditor: false });
      }
    } catch (error) {
      if (showErrors) {
        toast({
          title: 'Save failed',
          description: getSaveErrorMessage(error),
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveAthleteLog = (data) => persistAthleteLog(data, { closeEditor: true, updateShoes: true, showErrors: true });
  const handleAutoSaveAthleteLog = (data) => persistAthleteLog(data);
  const handleDeleteAthleteLogEntry = (data) => persistAthleteLog(data, { updateShoes: true, showErrors: true });

  const toggleFactorDraftKey = (key, checked) => {
    setFactorDraftKeys((currentKeys) => {
      const nextKeys = checked
        ? [...currentKeys, key]
        : currentKeys.filter((currentKey) => currentKey !== key);

      return normalizeTrainingFactorPreferences(nextKeys);
    });
  };

  const handleSaveFactorSettings = () => {
    updateTrainingFactorSettingsMutation.mutate(factorDraftKeys);
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
  const hasTrainingWeekGoal = Boolean(trainingWeek) && (
    (trainingWeek.goal_mileage_min !== null && trainingWeek.goal_mileage_min !== undefined) ||
    (trainingWeek.goal_mileage_max !== null && trainingWeek.goal_mileage_max !== undefined)
  );
  const showMileageGoal = isCoach || hasTrainingWeekGoal;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }
  
  return (
    <div className="btc-app-shell text-slate-900 dark:text-slate-100">
      <div className="relative mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-4 sm:py-6 2xl:px-8">
        {/* Header */}
        <div className="btc-rail-card mb-4 overflow-hidden rounded-2xl border border-slate-300 bg-white p-2.5 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-950 sm:mb-6 sm:p-3">
          <div className="flex flex-col gap-3 pl-2 lg:flex-row lg:items-center lg:justify-between">
            <BrandMark title="Bowerman Training Log" subtitle={isCoach ? 'Coach' : 'Athlete'} compact />
          
            <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-nowrap sm:gap-2 lg:justify-end">
              {!isCoach && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full rounded-full px-3 text-sm font-semibold sm:w-auto sm:px-4"
                    onClick={() => setFactorSettingsOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Log Fields
                  </Button>
                  <Link to={getPageUrlWithLogContext('ShoeInventory')} className="w-full sm:w-auto">
                    <Button className="h-9 w-full rounded-full bg-red-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 sm:w-auto sm:px-4">
                      <Footprints className="mr-2 h-4 w-4" />
                      Shoes
                    </Button>
                  </Link>
                </>
              )}
              {isCoach && (
                <Link to={getPageUrlWithLogContext('WeekTemplates')} className="w-full sm:w-auto">
                  <Button className="h-9 w-full rounded-full bg-red-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 sm:w-auto sm:px-4">
                    <Layers className="mr-2 h-4 w-4" />
                    Templates
                  </Button>
                </Link>
              )}
              <Link to={getPageUrlWithLogContext('Workouts')} className="w-full sm:w-auto">
                <Button className="h-9 w-full rounded-full bg-red-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 sm:w-auto sm:px-4">
                  <Activity className="mr-2 h-4 w-4" />
                  Workouts
                </Button>
              </Link>
              <Link to={getPageUrlWithLogContext('Account')} className="w-full sm:w-auto">
                <Button variant="outline" className="h-9 w-full rounded-full px-3 text-sm font-semibold sm:w-auto sm:px-4">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Account
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="col-span-2 h-9 justify-center sm:col-span-1" onClick={() => logout()}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        
        {/* Coach Athlete Selector */}
        {isCoach && athletes.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                <Users className="h-4 w-4" /> Viewing
              </Label>
              <Popover open={athleteSelectorOpen} onOpenChange={setAthleteSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={athleteSelectorOpen}
                    className="h-10 w-full max-w-sm justify-between border-slate-300 bg-white px-3 text-left font-normal text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:h-11"
                  >
                    <span className="min-w-0 truncate">
                      {selectedAthlete ? getDisplayName(selectedAthlete) : 'Select athlete'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(calc(100vw-2rem),24rem)] p-0">
                  <Command>
                    <CommandInput placeholder="Search athletes..." />
                    <CommandList>
                      <CommandEmpty>No athletes found.</CommandEmpty>
                      <CommandGroup>
                        {athleteOptions.map((athlete) => {
                          const displayName = getDisplayName(athlete);
                          const searchValue = [
                            displayName,
                            athlete.email,
                            athlete.phone_number,
                            athlete.id,
                          ].filter(Boolean).join(' ');

                          return (
                            <CommandItem
                              key={athlete.id}
                              value={searchValue}
                              onSelect={() => {
                                setViewingAthleteId(athlete.id);
                                setAthleteSelectorOpen(false);
                              }}
                              className="gap-3"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={athlete.profile_image_url} alt={displayName} className="object-cover" />
                                <AvatarFallback className="text-xs font-semibold">
                                  {getInitials(athlete)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{displayName}</div>
                                {athlete.email && (
                                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {athlete.email}
                                  </div>
                                )}
                              </div>
                              <Check
                                className={cn(
                                  'h-4 w-4 text-red-700 dark:text-red-300',
                                  athlete.id === effectiveAthleteId ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedAthlete && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:px-4 sm:py-3">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarImage src={selectedAthlete.profile_image_url} alt={getDisplayName(selectedAthlete)} className="object-cover" />
                  <AvatarFallback className="font-semibold">
                    {getInitials(selectedAthlete)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{getDisplayName(selectedAthlete)}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
                    {selectedAthlete.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedAthlete.email}
                      </span>
                    )}
                    {selectedAthlete.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedAthlete.phone_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* View Toggle + Navigation */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none px-3 sm:px-4 ${viewMode === 'week' ? 'bg-red-700 text-white hover:bg-red-800' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}
              onClick={() => setViewMode('week')}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 rounded-none px-3 sm:px-4 ${viewMode === 'month' ? 'bg-red-700 text-white hover:bg-red-800' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}
              onClick={() => setViewMode('month')}
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Month
            </Button>
          </div>
          {isCoach && viewMode === 'week' && trainingWeek && (
            <Button
              variant="outline"
              className="h-9 border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"
              onClick={() => setCopyDialogOpen(true)}
              disabled={loading || copyWeekMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Week
            </Button>
          )}
        </div>

        {viewMode === 'week' && (
          <WeekNavigation 
            currentWeekStart={currentWeekStart} 
            onWeekChange={setCurrentWeekStart} 
          />
        )}
        
        {/* Main Content */}
        {isCoach && !effectiveAthleteId ? (
          <div className="mt-8 rounded-xl border border-slate-300 bg-white p-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-950">
            <h3 className="mb-2 text-lg font-medium text-slate-700 dark:text-slate-200">No athlete selected</h3>
            <p className="text-slate-500 dark:text-slate-400">Select an athlete above to view or plan training.</p>
          </div>
        ) : viewMode === 'month' ? (
          loadingMonthPlans || loadingMonthWeeks ? (
            <div className="mt-8 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div>
              <MonthView
                rangeStart={rangeStart}
                rangeWeeks={rangeWeeks}
                onRangeStartChange={setRangeStart}
                onRangeWeeksChange={setRangeWeeks}
                allDayPlans={monthDayPlanMap}
                trainingWeeksByStart={monthTrainingWeekMap}
                onWeekClick={(weekStart) => {
                  setCurrentWeekStart(weekStart);
                  setViewMode('week');
                }}
                onDayClick={isCoach ? handleMonthEditDay : undefined}
                selectedDate={editorState.coachEditor ? editorState.selectedDay : null}
                inlineEditor={isCoach && editorState.coachEditor ? (
                  <CoachPlanEditor
                    variant="panel"
                    className="shadow-sm"
                    open={editorState.coachEditor}
                    onClose={() => setEditorState((current) => ({ ...current, coachEditor: false }))}
                    dayPlan={editorState.selectedDayPlan}
                    date={editorState.selectedDay}
                    onSave={handleSaveCoachPlan}
                    onAutoSave={handleAutoSaveCoachPlan}
                  />
                ) : null}
              />
            </div>
          )
        ) : loading ? (
          <div className="mt-8 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : !trainingWeek ? (
          <div className="mt-5 rounded-xl border border-slate-300 bg-white p-5 text-center shadow-md dark:border-slate-700 dark:bg-slate-950 sm:mt-8 sm:p-12">
            <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">No training week found</h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 sm:text-base">Create a training week to start planning.</p>
            <Button className="w-full sm:w-auto" onClick={() => createWeekMutation.mutate()} disabled={createWeekMutation.isPending}>
              {createWeekMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Training Week
            </Button>
          </div>
        ) : (
          <>
            {/* Weekly Grid */}
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950 sm:mt-6">
              <div className="overflow-x-auto">
                <div className="flex min-w-[756px] w-full sm:min-w-[896px] lg:min-w-[980px]">
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
            <div className={`mt-4 grid items-stretch gap-3 sm:mt-6 sm:gap-4 ${showMileageGoal ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : ''}`}>
              {showMileageGoal && (
                <WeeklyMileageGoal
                  trainingWeek={trainingWeek}
                  isCoach={isCoach}
                  dayPlans={dayPlans}
                  onSave={(data) => updateWeekMutation.mutateAsync(data)}
                />
              )}
              <WeeklyTotals dayPlans={dayPlans} />
            </div>
            
            {/* Weekly Reflection */}
            <div className="mt-4 sm:mt-6">
              <WeeklyReflection
                trainingWeek={trainingWeek}
                onSave={(data) => updateWeekMutation.mutateAsync(data)}
                isCoach={isCoach}
              />
            </div>
          </>
        )}
      </div>

      {!isCoach && (
        <Dialog open={factorSettingsOpen} onOpenChange={setFactorSettingsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Fields</DialogTitle>
            </DialogHeader>

            <div className="grid gap-2 py-2">
              {TRAINING_FACTOR_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <Checkbox
                    checked={factorDraftKeys.includes(option.key)}
                    onCheckedChange={(checked) => toggleFactorDraftKey(option.key, Boolean(checked))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFactorSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveFactorSettings}
                disabled={updateTrainingFactorSettingsMutation.isPending}
              >
                {updateTrainingFactorSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Editors */}
      <CoachPlanEditor
        open={editorState.coachEditor && viewMode !== 'month'}
        onClose={() => setEditorState({ ...editorState, coachEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveCoachPlan}
        onAutoSave={handleAutoSaveCoachPlan}
      />
      
      <AthleteLogEditor
        open={editorState.athleteEditor}
        onClose={() => setEditorState({ ...editorState, athleteEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveAthleteLog}
        onAutoSave={handleAutoSaveAthleteLog}
        onDeleteEntry={handleDeleteAthleteLogEntry}
        shoes={shoes}
        trainingFactorOptions={activeTrainingFactorOptions}
      />
      
      <SplitsEditor
        open={editorState.splitsEditor}
        onClose={() => setEditorState({ ...editorState, splitsEditor: false })}
        dayPlan={editorState.selectedDayPlan}
        date={editorState.selectedDay}
        onSave={handleSaveSplits}
      />

      {isCoach && (
        <CopyWeekToAthletesDialog
          open={copyDialogOpen}
          onClose={() => setCopyDialogOpen(false)}
          athletes={athletes}
          currentAthleteId={effectiveAthleteId}
          currentWeekStart={currentWeekStart}
          hasSourcePlan={hasSourceCoachPlan}
          isSubmitting={copyWeekMutation.isPending}
          onCopy={(payload) => copyWeekMutation.mutate(payload)}
        />
      )}
    </div>
  );
}
