import { cn } from "@/lib/supabase/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}

function Card({ children, className, glass = true }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6",
        glass
          ? "bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
          : "bg-[#0f1729] border border-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 space-y-1", className)}>
      {children}
    </div>
  );
}

function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}

function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-6 pt-4 border-t border-white/10 flex items-center gap-3", className)}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody, CardFooter };