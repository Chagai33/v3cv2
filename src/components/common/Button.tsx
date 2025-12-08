import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  // For polymorphic support (minimal version for label support)
  as?: React.ElementType;
  htmlFor?: string; // For label
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      fullWidth = false,
      className = '',
      disabled,
      as,
      ...props
    },
    ref
  ) => {
    const Component = as || 'button';

    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-lg',
      md: 'px-4 py-2 text-sm gap-2 rounded-lg',
      lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
    };

    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-transparent',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
      success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm border border-transparent',
      danger: 'bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-sm hover:border-red-300', // Modern outline-ish danger
      outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    };

    // Specific override for danger variant if we want solid red
    const solidDanger = 'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-transparent';
    
    const variantStyles = variant === 'danger' && props.name === 'solid-danger' ? solidDanger : variants[variant];

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <Component
        ref={ref}
        className={`
          ${baseStyles}
          ${sizes[size]}
          ${variantStyles}
          ${widthStyles}
          ${className}
        `}
        disabled={isLoading || disabled}
        dir="auto"
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="whitespace-nowrap">{children}</span>
      </Component>
    );
  }
);

Button.displayName = 'Button';
