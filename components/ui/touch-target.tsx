import { cn } from "@/lib/utils";

interface TouchTargetProps {
  /** The content to wrap */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center content (default: true) */
  centered?: boolean;
  /** HTML element to render (default: div) */
  as?: "div" | "span" | "button";
}

/**
 * TouchTarget - Ensures minimum 44px touch target size
 *
 * WCAG 2.1 Success Criterion 2.5.5 requires a minimum touch target
 * size of 44x44 CSS pixels for interactive elements.
 *
 * This component wraps content and ensures the minimum size is met,
 * which is especially important for mobile devices.
 *
 * @example
 * ```tsx
 * <TouchTarget>
 *   <Icon className="size-4" />
 * </TouchTarget>
 * ```
 *
 * @example
 * ```tsx
 * // Non-centered content
 * <TouchTarget centered={false}>
 *   <span>Click me</span>
 * </TouchTarget>
 * ```
 */
export function TouchTarget({
  children,
  className,
  centered = true,
  as: Component = "div",
}: TouchTargetProps) {
  return (
    <Component
      className={cn(
        "min-h-[44px] min-w-[44px]",
        centered && "flex items-center justify-center",
        className
      )}
    >
      {children}
    </Component>
  );
}

/**
 * TouchTargetButton - Button with guaranteed 44px touch target
 *
 * Extends the TouchTarget concept for button elements specifically.
 * Inherits all standard button props.
 */
export function TouchTargetButton({
  children,
  className,
  centered = true,
  ...props
}: TouchTargetProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "min-h-[44px] min-w-[44px]",
        centered && "flex items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * TouchTargetLink - Anchor with guaranteed 44px touch target
 *
 * For use with native anchor elements. For Next.js Link,
 * wrap the Link component with TouchTarget instead.
 */
export function TouchTargetLink({
  children,
  className,
  centered = true,
  ...props
}: TouchTargetProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "min-h-[44px] min-w-[44px]",
        centered && "flex items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
