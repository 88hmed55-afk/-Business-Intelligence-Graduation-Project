import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  linkTo?: string;
  compact?: boolean;
}

export function Logo({ className, linkTo = "/", compact }: LogoProps) {
  return (
    <Link to={linkTo} className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
          <path
            d="M5 17v-3M9.5 17V11M14 17V14M18.5 17V7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight">
            Nova<span className="gradient-text">BI</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}
