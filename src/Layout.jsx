import React from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
      <Analytics />
    </div>
  );
}
