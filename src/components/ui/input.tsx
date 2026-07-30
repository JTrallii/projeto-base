"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/supabase/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-white/80"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-white placeholder:text-white/30 outline-none transition-all",
              "focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && "pl-11",
              error &&
                "border-red-500/50 focus:border-red-500 focus:ring-red-500/50",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;