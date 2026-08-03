import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  LEGACY_WORKOUT_TYPES,
  WORKOUT_TYPE_MENU,
  displayWorkoutTypes,
  formatWorkoutTypes,
  parseWorkoutTypes,
} from './sessionUtils';

export default function WorkoutTypePicker({ value, onChange, className, triggerClassName, xtrainOther = '' }) {
  const selectedTypes = parseWorkoutTypes(value);
  const displayValue = displayWorkoutTypes(selectedTypes, xtrainOther);

  const updateSelection = (type) => {
    const checked = !selectedTypes.includes(type);
    const nextTypes = checked
      ? [...selectedTypes, type]
      : selectedTypes.filter((selectedType) => selectedType !== type);

    onChange(formatWorkoutTypes(nextTypes));
  };

  const renderSelectableItem = ({ label, value: itemValue }) => {
    const selected = selectedTypes.includes(itemValue);

    return (
      <DropdownMenuItem
        key={itemValue}
        className={cn(selected && "font-semibold text-red-700 dark:text-red-200")}
        onSelect={(event) => {
          event.preventDefault();
          updateSelection(itemValue);
        }}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {selected && <Check className="h-4 w-4 text-red-600 dark:text-red-300" />}
      </DropdownMenuItem>
    );
  };

  const renderMenuItem = (item) => {
    if (item.options?.length) {
      const selectedOptions = item.options.filter((option) => selectedTypes.includes(option.value));
      const label = selectedOptions.length
        ? `${item.label} (${selectedOptions.map((option) => option.label).join(' OR ')})`
        : item.label;

      return (
        <DropdownMenuSub key={item.label}>
          <DropdownMenuSubTrigger className={cn(selectedOptions.length > 0 && "font-semibold text-red-700 dark:text-red-200")}>
            <span className="min-w-0 truncate">{label}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {item.options.map(renderSelectableItem)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return renderSelectableItem(item);
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
      <DropdownMenuContent align="start" className={cn("w-72", className)}>
        <div className="px-2 pb-2 pt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
          Check multiple types to offer athlete choice. Selected options appear as OR.
        </div>
        {WORKOUT_TYPE_MENU.map(renderMenuItem)}
        {LEGACY_WORKOUT_TYPES.some((type) => selectedTypes.includes(type)) && (
          <>
            <DropdownMenuSeparator />
            {LEGACY_WORKOUT_TYPES
              .filter((type) => selectedTypes.includes(type))
              .map((type) => (
                <DropdownMenuItem
                  key={type}
                  className="font-semibold text-red-700 dark:text-red-200"
                  onSelect={(event) => {
                    event.preventDefault();
                    updateSelection(type);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{type}</span>
                  <Check className="h-4 w-4 text-red-600 dark:text-red-300" />
                </DropdownMenuItem>
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
