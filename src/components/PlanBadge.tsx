export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={plan === "premium" ? "badge-premium" : "badge-basic"}>
      {plan === "premium" ? "Premium" : "Basic"}
    </span>
  );
}

export function UpgradeBanner({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">🔒</span>
        <p>{message || "Bu özellik için Premium gerekir."}</p>
      </div>
    </div>
  );
}
