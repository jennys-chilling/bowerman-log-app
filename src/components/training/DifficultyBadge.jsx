import React from 'react';
import { cn } from "@/lib/utils";
import { getRpeColorClasses } from "./rpeColors";

export default function DifficultyBadge({ level, size = 'md', showLabel = true }) {
  if (!level) return null;
  const rpeColors = getRpeColorClasses(level);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full flex items-center justify-center font-bold shadow-sm",
        rpeColors.solid,
        sizeClasses[size]
      )}>
        {level}
      </div>
      {showLabel && <span className="text-xs text-slate-500">Difficulty</span>}
    </div>
  );
}

export function DifficultyKey() {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-slate-500 mr-2">Difficulty:</span>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
        <div
          key={level}
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            getRpeColorClasses(level).solid
          )}
        >
          {level}
        </div>
      ))}
    </div>
  );
}
