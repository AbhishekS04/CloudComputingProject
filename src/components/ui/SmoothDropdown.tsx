import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'reicon-react';
import { cn } from '../../lib/utils';

export interface SmoothDropdownOption {
  value: string;
  label: string;
}

export interface SmoothDropdownProps {
  value: string;
  onChange: (nextValue: string) => void;
  options: SmoothDropdownOption[];
  ariaLabel?: string;
  placement?: 'auto' | 'top' | 'bottom';
  align?: 'left' | 'right';
  size?: 'xs' | 'sm';
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
}

/**
 * Reusable smooth spring-animated dropdown replacing native <select> popups.
 */
export function SmoothDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  placement = 'auto',
  align = 'left',
  size = 'sm',
  className,
  triggerClassName,
  menuClassName,
}: SmoothDropdownProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(placement === 'top');
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) return;

    if (placement === 'auto' && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedMenuHeight = Math.min(220, options.length * 36 + 16);
      setOpenUp(spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight);
    } else {
      setOpenUp(placement === 'top');
    }

    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, placement, options.length]);

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center justify-between gap-1.5 font-medium transition-all cursor-pointer select-none',
          size === 'xs' ? 'h-7 px-2 text-[10.5px]' : 'h-8 px-2.5 text-xs',
          'rounded-xl bg-white hover:bg-neutral-50 dark:bg-[#23222C] dark:hover:bg-[#2C2B37] border border-[#DDD6C6] dark:border-white/[0.1] text-charcoal-900 dark:text-cream-100 shadow-2xs',
          triggerClassName
        )}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          className="inline-flex items-center justify-center shrink-0 opacity-70"
        >
          <ChevronDown size={size === 'xs' ? 11 : 13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="smooth-dropdown-menu"
            role="listbox"
            initial={{
              opacity: 0,
              scale: 0.94,
              y: openUp ? 6 : -6,
              filter: 'blur(4px)',
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: openUp ? 5 : -5,
              filter: 'blur(4px)',
            }}
            transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }}
            style={{
              transformOrigin: `${openUp ? 'bottom' : 'top'} ${align === 'right' ? 'right' : 'left'}`,
            }}
            className={cn(
              'absolute z-50 min-w-[148px] max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto rounded-xl p-1',
              'bg-white/95 dark:bg-[#191821]/95 backdrop-blur-xl',
              'border border-[#DDD6C6] dark:border-white/[0.12]',
              'shadow-xl shadow-black/15 dark:shadow-black/60',
              openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
              align === 'right' ? 'right-0' : 'left-0',
              menuClassName
            )}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.14 }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-neutral-900/[0.07] dark:bg-white/[0.11] text-neutral-950 dark:text-white font-semibold'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-900/[0.04] dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-white'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} className="shrink-0 text-emerald-500" />}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SmoothDropdown;
