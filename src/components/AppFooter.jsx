import React from 'react';
import FeedbackButton from '@/components/FeedbackButton';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppFooter() {
  return (
    <footer className="relative z-10 px-4 pb-4 pt-2">
      <div className="mx-auto flex w-full max-w-[1800px] justify-end 2xl:px-4">
        <div className="flex items-center justify-end gap-2">
          <FeedbackButton />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
