import React from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  WORKOUT_TYPES,
  formatWorkoutTypes,
  parseWorkoutTypes,
} from './sessionUtils';

export default function WorkoutTypePicker({ value, onChange, className, triggerClassName }) {
  const selectedTypes = parseWorkoutTypes(value);
  const displayValue = formatWorkoutTypes(selectedTypes);

  const updateSelection = (type, checked) => {
    const nextTypes = checked
      ? [...selectedTypes, type]
      : selectedTypes.filter((selectedType) => selectedType !== type);

    onChange(formatWorkoutTypes(nextTypes));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between gap-2 px-3 font-normal", triggerClassName)}
        >
          <span className={cn("min-w-0 truncate text-left", !displayValue && "text-slate-500 dark:text-slate-400")}>
            {displayValue || 'Select type'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn("w-56", className)}>
        {WORKOUT_TYPES.map((type) => (
          <DropdownMenuCheckboxItem
            key={type}
            checked={selectedTypes.includes(type)}
            onCheckedChange={(checked) => updateSelection(type, Boolean(checked))}
            onSelect={(event) => event.preventDefault()}
          >
            {type}
          </DropdownMenuCheckboxItem>
        ))}
        {selectedTypes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start px-2 text-xs"
              onClick={() => onChange('')}
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Clear types
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
