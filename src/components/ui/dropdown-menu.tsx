"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Click outside handler
  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const isTriggerClick = triggerRef.current?.contains(event.target as Node);
      const isContentClick = contentRef.current?.contains(event.target as Node);
      
      if (!isTriggerClick && !isContentClick) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  const { open, setOpen, triggerRef } = context;

  // Clone children to inject ref, onClick and state
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(!open);
      if (child.props.onClick) child.props.onClick(e);
    },
  } as any);
}

export function DropdownMenuContent({
  children,
  align = "end",
  className = "",
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu");

  const { open, triggerRef, contentRef } = context;
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  // Recalculate trigger coordinates dynamically on window resize or scroll
  const updateCoords = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 192; // equivalent to w-48
      
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: align === "end"
          ? rect.right - menuWidth + window.scrollX
          : align === "center"
          ? rect.left + (rect.width - menuWidth) / 2 + window.scrollX
          : rect.left + window.scrollX
      });
    }
  }, [triggerRef, align]);

  React.useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open, updateCoords]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className={`w-48 rounded-2xl shadow-2xl bg-white border border-slate-200/80 focus:outline-none z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-0.5" role="none">
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuItem must be used within DropdownMenu");

  const { setOpen } = context;

  return (
    <button
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        if (onClick) onClick(e);
        setTimeout(() => {
          setOpen(false);
        }, 50);
      }}
      disabled={disabled}
      className={`flex w-full items-center rounded-xl px-3 py-2 text-sm text-left font-bold transition-colors ${
        disabled
          ? "text-slate-400 cursor-not-allowed"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
      } ${className}`}
      role="menuitem"
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className = "" }: { className?: string }) {
  return <div className={`my-1 h-px bg-slate-100 ${className}`} />;
}
