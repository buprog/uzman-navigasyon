export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={plan === "premium" ? "badge-premium" : "badge-basic"}>
      {plan === "premium" ? "Premium" : "Basic"}
    </span>
  );
}

export function UpgradeBanner({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>{message || "Bu özellik için Premium gerekir."}</p>
      <a href="/ayarlar" className="mt-1 inline-block font-semibold text-amber-800 underline">
        Premium&apos;a geç
      </a>
    </div>
  );
}
