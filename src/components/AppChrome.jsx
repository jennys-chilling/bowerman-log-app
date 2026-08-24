import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AppPage({ children, maxWidth = 'max-w-[1800px]', className }) {
  return (
    <div className={cn('relative mx-auto w-full px-3 py-4 sm:px-4 sm:py-6 2xl:px-8', maxWidth, className)}>
      {children}
    </div>
  );
}

function HeaderMenuItems({ items, variant = 'desktop' }) {
  if (!items?.length) return null;

  if (variant === 'desktop') {
    return (
      <div className="btc-header-menu-desktop hidden sm:contents">
        {items.map((item) => {
          const Icon = item.icon;
          const buttonProps = {
            type: 'button',
            variant: item.variant || 'outline',
            size: item.size || 'sm',
            className: cn('h-9 rounded-full px-3 text-sm font-semibold sm:px-4', item.className),
            onClick: item.onClick,
            disabled: item.disabled,
          };

          const content = (
            <>
              {Icon ? <Icon className="mr-1.5 h-4 w-4" /> : null}
              {item.label}
            </>
          );

          if (item.to) {
            return (
              <Link key={item.key || item.label} to={item.to} className="w-full sm:w-auto">
                <Button {...buttonProps} className={cn(buttonProps.className, 'w-full sm:w-auto')}>
                  {content}
                </Button>
              </Link>
            );
          }

          return (
            <Button key={item.key || item.label} {...buttonProps}>
              {content}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full px-3 text-sm font-semibold sm:hidden"
          aria-label="More navigation options"
        >
          <MoreHorizontal className="mr-1.5 h-4 w-4" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {items.map((item, index) => {
          const Icon = item.icon;
          const content = (
            <>
              {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
              <span>{item.label}</span>
            </>
          );

          return (
            <React.Fragment key={item.key || item.label}>
              {item.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
              {item.to ? (
                <DropdownMenuItem asChild>
                  <Link to={item.to}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={item.disabled}
                  onSelect={() => item.onClick?.()}
                >
                  {content}
                </DropdownMenuItem>
              )}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({
  title = 'Bowerman Training Log',
  subtitle,
  backTo,
  actions,
  menuItems = [],
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

      {(actions || menuItems.length > 0 || meta) && (
        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          {(actions || menuItems.length > 0) && (
            <div className="btc-header-actions">
              {actions}
              <HeaderMenuItems items={menuItems} variant="desktop" />
              <HeaderMenuItems items={menuItems} variant="mobile" />
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
