import React from 'react';
import { twMerge } from 'tailwind-merge';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        'animate-pulse rounded-xl bg-stone-200/80',
        className
      )}
      {...props}
    />
  );
}
