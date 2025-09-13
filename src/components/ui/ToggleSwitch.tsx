"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  pressed: boolean;
  onPressedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

// Accessible toggle switch (button) alternative to the basic Switch component.
export function ToggleSwitch({
  pressed,
  onPressedChange,
  disabled,
  className,
  label,
  description,
}: ToggleSwitchProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        disabled={disabled}
        onClick={() => !disabled && onPressedChange(!pressed)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
          pressed
            ? "bg-primary border-primary hover:bg-primary/90"
            : "bg-input/70 border-input hover:bg-input",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-background shadow-sm ring-0 transition-transform",
            pressed && "translate-x-5"
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col select-none">
          {label && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onPressedChange(!pressed)}
              className={cn(
                "text-sm font-medium text-left",
                disabled ? "text-muted-foreground/60" : "text-foreground"
              )}
            >
              {label}
              <span className={"ml-2 text-xs font-semibold inline-block px-1.5 py-0.5 rounded-full border uppercase tracking-wide " + (pressed ? "bg-primary/10 border-primary/50 text-primary" : "bg-muted border-border text-muted-foreground")}>{pressed ? "On" : "Off"}</span>
            </button>
          )}
          {description && (
            <p className="text-xs mt-1 text-muted-foreground/70 leading-snug max-w-xs">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
