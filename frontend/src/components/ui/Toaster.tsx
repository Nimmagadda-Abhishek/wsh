import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { dismissToast, useStore } from "../../store";
import { cn } from "../../utils/cn";

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertCircle : Info;
        return (
          <div
            key={t.id}
            className={cn(
              "page-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-[0_18px_40px_-16px_rgba(10,28,63,0.45)]",
              t.kind === "success" && "border-emerald-200",
              t.kind === "error" && "border-red-200",
              t.kind === "info" && "border-line",
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", t.kind === "success" ? "text-verified" : t.kind === "error" ? "text-red-500" : "text-navy-600")} />
            <p className="flex-1 text-[12.5px] font-medium text-navy-900">{t.message}</p>
            {t.to && (
              <Link to={t.to} onClick={() => dismissToast(t.id)} className="text-[12px] font-bold text-navy-600 hover:underline">
                View
              </Link>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="rounded p-0.5 text-slate-400 hover:text-navy-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
