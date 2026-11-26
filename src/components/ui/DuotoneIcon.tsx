import React from 'react';
import type { IconComponent } from 'reicon-react';
import { cn } from '../../lib/utils';

export interface DuotoneIconProps {
  icon: IconComponent;
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  secondaryOpacity?: number;
  strokeWidth?: number | string;
  className?: string;
  secondaryClassName?: string;
}

/**
 * Renders a Reicon component with layered Filled (soft secondary tone)
 * + Outline (crisp primary stroke) paths for semantic duotone depth.
 */
export function DuotoneIcon({
  icon: Icon,
  size = 16,
  color,
  secondaryColor,
  secondaryOpacity = 0.22,
  strokeWidth,
  className,
  secondaryClassName,
}: DuotoneIconProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 leading-none',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon
        weight="Filled"
        size={size}
        color={secondaryColor}
        className={cn('pointer-events-none select-none', secondaryClassName)}
        style={{
          opacity: secondaryColor ? secondaryOpacity : secondaryOpacity,
        }}
      />
      <Icon
        weight="Outline"
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className="pointer-events-none select-none absolute inset-0"
      />
    </span>
  );
}

export default DuotoneIcon;
