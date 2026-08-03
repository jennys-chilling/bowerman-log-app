import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppPage({ children, maxWidth = 'max-w-[1800px]', className }) {
  return (
    <div className={cn('relative mx-auto w-full px-3 py-4 sm:px-4 sm:py-6 2xl:px-8', maxWidth, className)}>
      {children}
    </div>
  );
}

export function AppHeader({
  title = 'Bowerman Training Log',
  subtitle,
  backTo,
  actions,
  meta,
  className,
}) {
  return (
    <header className={cn('btc-page-header mb-4 sm:mb-6', className)}>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {backTo && (
          <Link to={backTo} className="shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div className="min-w-0">
          <BrandMark title={title} subtitle={subtitle} compact />
        </div>
      </div>

      {(actions || meta) && (
        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          {actions && (
            <div className="btc-header-actions">
              {actions}
            </div>
          )}
          {meta}
        </div>
      )}
    </header>
  );
}

export function PagePanel({ children, className }) {
  return (
    <section className={cn('btc-panel', className)}>
      {children}
    </section>
  );
}
