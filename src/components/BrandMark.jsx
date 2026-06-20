import React from 'react';

export default function BrandMark({ title = 'Bowerman Training Log', subtitle, compact = false }) {
  return (
    <div className="btc-brand-lockup">
      <img
        src="/brand/bowerman-track-club-logo.png"
        alt="Bowerman Track Club"
        className={compact ? 'btc-logo-mark !h-10 !w-10' : 'btc-logo-mark'}
      />
      <div>
        <div className={compact ? 'text-lg font-black uppercase' : 'text-2xl font-black uppercase'}>
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs font-semibold uppercase text-red-700 dark:text-red-300">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
