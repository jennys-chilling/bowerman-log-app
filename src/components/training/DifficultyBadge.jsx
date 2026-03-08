import React from 'react';
import { cn } from "@/lib/utils";

const difficultyColors = {
  1: 'bg-emerald-400 text-emerald-950',
  2: 'bg-emerald-500 text-white',
  3: 'bg-lime-500 text-lime-950',
  4: 'bg-yellow-400 text-yellow-950',
  5: 'bg-amber-500 text-white',
  6: 'bg-orange-500 text-white',
  7: 'bg-orange-600 text-white',
  8: 'bg-red-500 text-white',
  9: 'bg-red-700 text-white',
};

export default function DifficultyBadge({ level, size = 'md', showLabel = true }) {
  if (!level) return null;
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full flex items-center justify-center font-bold shadow-sm",
        difficultyColors[level] || 'bg-gray-200',
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
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
        <div
          key={level}
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            difficultyColors[level]
          )}
        >
          {level}
        </div>
      ))}
    </div>
  );
}