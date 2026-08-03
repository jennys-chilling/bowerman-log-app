import React from 'react';

export default function BrandMark({ title = 'Bowerman Training Log', subtitle, compact = false }) {
  return (
    <div className="btc-brand-lockup">
      <img
        src="/brand/bowerman-track-club-logo.png"
        alt="Bowerman Track Club"
        className={compact ? 'btc-logo-mark !h-9 !w-9 sm:!h-10 sm:!w-10' : 'btc-logo-mark'}
      />
      <div className="min-w-0">
        <div className={compact ? 'truncate text-base font-black uppercase leading-tight sm:text-lg' : 'text-2xl font-black uppercase'}>
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[11px] font-extrabold uppercase text-red-700 dark:text-red-300 sm:text-xs">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
