import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyDataCard({
  title,
  text,
  action = "Add data",
  to = "/dashboard",
}: {
  title: string;
  text: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Search className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-[16px] font-bold text-navy-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500">{text}</p>
      <Link to={to} className="btn-navy mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-xs">
        <Plus className="h-4 w-4" />
        {action}
      </Link>
    </div>
  );
}
