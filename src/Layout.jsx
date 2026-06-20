import React from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Analytics />
    </div>
  );
}
