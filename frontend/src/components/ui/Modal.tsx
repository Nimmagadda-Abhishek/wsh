import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, subtitle, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/70 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "page-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        {(title || subtitle) && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-[18px] font-bold text-navy-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 -mt-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-semibold text-navy-900">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputCls = "h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] text-ink placeholder:text-slate-400 transition-colors focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";
export const textareaCls = "w-full rounded-md border border-slate-300 px-3 py-2.5 text-[13px] text-ink placeholder:text-slate-400 transition-colors focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

export function ChoiceGroup<T extends string>({ options, value, onChange, name, cols = 3 }: { options: T[]; value: T; onChange: (v: T) => void; name: string; cols?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")} role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px] font-medium transition-all",
            value === o ? "border-navy-800 bg-navy-800 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-navy-700 hover:bg-navy-50",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function PrimaryBtn({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className={cn("btn-gold w-full py-3 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-60", className)}
      {...rest}
    />
  );
}
export function SecondaryBtn({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-[13px] font-semibold text-navy-800 transition-colors hover:border-navy-700 hover:bg-navy-50", className)}
      {...rest}
    />
  );
}
