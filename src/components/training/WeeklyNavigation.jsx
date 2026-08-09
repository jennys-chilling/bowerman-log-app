import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isThisWeek } from "date-fns";

export default function WeekNavigation({ currentWeekStart, onWeekChange }) {
  const goToPreviousWeek = () => onWeekChange(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => onWeekChange(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekEnd = addDays(currentWeekStart, 6);
  const isCurrentWeek = isThisWeek(currentWeekStart, { weekStartsOn: 1 });
  
  return (
    <div className="btc-panel px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-center sm:order-2 sm:flex-1">
          <div className="whitespace-nowrap text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
          {isCurrentWeek && (
            <span className="btc-current-week-label text-xs font-medium">Current Week</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:contents">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
            className="h-9 px-2 hover:bg-slate-100 dark:hover:bg-slate-900 sm:order-1 sm:px-3"
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span>Previous</span>
          </Button>

          <Button
            variant={isCurrentWeek ? "ghost" : "outline"}
            size="sm"
            onClick={goToCurrentWeek}
            disabled={isCurrentWeek}
            className="h-9 px-2 text-xs sm:order-3 sm:px-3"
          >
            <Calendar className="mr-1 h-3.5 w-3.5" />
            Today
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextWeek}
            className="h-9 px-2 hover:bg-slate-100 dark:hover:bg-slate-900 sm:order-4 sm:px-3"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
