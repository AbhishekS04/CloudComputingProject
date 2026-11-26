import React from 'react';
import { cn } from '../../lib/utils';

export interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders the BIFROST emblem: black artwork in light mode, white artwork in dark mode.
 */
export function BrandLogo({ size, className, alt = 'BIFROST' }: BrandLogoProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 select-none',
        !size && 'w-9 h-9',
        className
      )}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src="/logos/bifrost-black.png"
        alt={alt}
        draggable={false}
        className="block dark:hidden w-full h-full object-contain"
      />
      <img
        src="/logos/bifrost-white.png"
        alt={alt}
        draggable={false}
        className="hidden dark:block w-full h-full object-contain"
      />
    </span>
  );
}
