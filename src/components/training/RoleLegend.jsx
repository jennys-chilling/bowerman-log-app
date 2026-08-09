import React from 'react';
import { cn } from '@/lib/utils';

export default function RoleLegend({ className }) {
  return (
    <div className={cn('btc-role-legend', className)} aria-label="Training entry key">
      <span className="btc-role-legend-item">
        <span className="btc-role-legend-swatch btc-role-legend-swatch-coach" aria-hidden="true" />
        Coach plan
      </span>
      <span className="btc-role-legend-item">
        <span className="btc-role-legend-swatch btc-role-legend-swatch-athlete" aria-hidden="true" />
        Athlete log
      </span>
    </div>
  );
}
