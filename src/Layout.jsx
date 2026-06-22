import React from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function Layout({ children }) {
  return (
    <div className="btc-app-shell flex min-h-screen flex-col text-slate-900 dark:text-slate-100">
      <main className="relative z-10 flex-1">
        {children}
      </main>
      <Analytics />
    </div>
  );
}
