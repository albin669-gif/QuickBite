import React from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              'w-full px-3.5 py-2.5 rounded-xl border bg-white text-stone-900 placeholder:text-stone-400 text-sm transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-stone-300 hover:border-stone-400',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
