import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, isThisWeek } from "date-fns";

export default function WeekNavigation({ currentWeekStart, onWeekChange }) {
  const goToPreviousWeek = () => onWeekChange(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => onWeekChange(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekEnd = addWeeks(currentWeekStart, 1);
  const isCurrentWeek = isThisWeek(currentWeekStart, { weekStartsOn: 1 });
  
  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={goToPreviousWeek}
        className="hover:bg-slate-100"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </Button>
      
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">
            {format(currentWeekStart, 'MMM d')} – {format(addWeeks(currentWeekStart, 1), 'MMM d, yyyy')}
          </div>
          {isCurrentWeek && (
            <span className="text-xs text-emerald-600 font-medium">Current Week</span>
          )}
        </div>
        
        {!isCurrentWeek && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToCurrentWeek}
            className="text-xs"
          >
            <Calendar className="w-3 h-3 mr-1" />
            Today
          </Button>
        )}
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={goToNextWeek}
        className="hover:bg-slate-100"
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}