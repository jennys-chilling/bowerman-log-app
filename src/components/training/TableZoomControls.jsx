import React from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const toPercent = (value) => Math.round(value * 100);

export default function TableZoomControls({
  value,
  min = 0.4,
  max = 1.2,
  step = 0.05,
  onChange,
  onFit,
  onReset,
  className,
}) {
  const nextValue = (direction) => {
    const adjusted = value + (direction * step);
    onChange(Math.min(max, Math.max(min, Number(adjusted.toFixed(2)))));
  };

  return (
    <div className={cn('btc-table-zoom-control', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Zoom out"
        onClick={() => nextValue(-1)}
        disabled={value <= min}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <Slider
        value={[toPercent(value)]}
        min={toPercent(min)}
        max={toPercent(max)}
        step={toPercent(step)}
        aria-label="Table zoom"
        className="min-w-24 flex-1"
        onValueChange={([next]) => onChange(next / 100)}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Zoom in"
        onClick={() => nextValue(1)}
        disabled={value >= max}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-10 text-center text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">
        {toPercent(value)}%
      </div>

      {onFit && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Fit table"
          onClick={onFit}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Reset zoom"
        onClick={onReset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
