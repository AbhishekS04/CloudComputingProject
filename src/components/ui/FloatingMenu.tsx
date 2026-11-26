import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const path1Variants = {
  closed: { d: "M 2 5 L 16 5" },
  open: { d: "M 4 4 L 14 14" },
};

const path2Variants = {
  closed: { d: "M 2 13 L 16 13" },
  open: { d: "M 4 14 L 14 4" },
};

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 18 18"
      className="text-neutral-800 dark:text-neutral-100"
      aria-hidden="true"
    >
      <motion.path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        variants={path1Variants}
        animate={isOpen ? "open" : "closed"}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      />
      <motion.path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        variants={path2Variants}
        animate={isOpen ? "open" : "closed"}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      />
    </svg>
  );
}

export interface FloatingMenuLink {
  label: string;
  to: string;
  badge?: React.ReactNode;
  active?: boolean;
}

export interface FloatingMenuProps
  extends React.HTMLAttributes<HTMLDivElement> {
  links: FloatingMenuLink[];
  footerContent?: React.ReactNode;
  statusIndicator?: React.ReactNode;
}

export const FloatingMenu = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ links, footerContent, statusIndicator, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(
      ref,
      () => containerRef.current as HTMLDivElement,
      []
    );

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen]);

    return (
      <div
        ref={containerRef}
        className={cn("relative select-none", className)}
        {...props}
      >
        {/* Compact Glass Menu Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer",
            "bg-white/75 hover:bg-white/95 dark:bg-[#1a1c20]/75 dark:hover:bg-[#23262c]/90",
            "backdrop-blur-md border border-black/[0.07] dark:border-white/[0.1]",
            "text-neutral-800 dark:text-neutral-100 shadow-xs active:scale-[0.97]"
          )}
        >
          {statusIndicator}
          <span className="tracking-tight">
            {isOpen ? "Close" : "Menu"}
          </span>
          <MenuIcon isOpen={isOpen} />
        </button>

        {/* Refined Floating Glass Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="refined-floating-menu"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              style={{ transformOrigin: "top right" }}
              className={cn(
                "absolute right-0 mt-2.5 w-[min(340px,calc(100vw-20px))] rounded-2xl p-2.5",
                "bg-white/92 dark:bg-[#16171a]/92 backdrop-blur-2xl",
                "border border-black/[0.08] dark:border-white/[0.1]",
                "shadow-2xl shadow-black/15 dark:shadow-black/60"
              )}
            >
              {/* Text-only Navigation Links */}
              <div className="px-2 pt-1 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                  Pages
                </span>
              </div>

              <nav className="flex flex-col gap-0.5">
                {links.map((link, idx) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.18 }}
                  >
                    <Link
                      to={link.to}
                      data-cuelume-navigate
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150",
                        link.active
                          ? "bg-neutral-900/[0.06] dark:bg-white/[0.09] text-neutral-950 dark:text-white"
                          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-900/[0.04] dark:hover:bg-white/[0.05] hover:text-neutral-950 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "text-[15px] tracking-tight transition-transform duration-150 group-hover:translate-x-0.5",
                            link.active ? "font-semibold" : "font-medium"
                          )}
                        >
                          {link.label}
                        </span>
                        {link.badge}
                      </div>

                      {link.active && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-900/8 text-neutral-700 dark:bg-white/12 dark:text-neutral-200">
                          Active
                        </span>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {footerContent && (
                <div className="mt-2 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.07]">
                  {footerContent}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FloatingMenu.displayName = "FloatingMenu";

export default FloatingMenu;
