import { clsx } from "clsx";
import type { Verdict } from "../../types";

// ── Verdict Badge ─────────────────────────────────────────────────────────────
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cls =
    verdict === "pass"
      ? "badge-pass"
      : verdict === "fail"
      ? "badge-fail"
      : "badge-inconclusive";
  const dot =
    verdict === "pass"
      ? "bg-pass"
      : verdict === "fail"
      ? "bg-fail"
      : "bg-inconclusive";
  return (
    <span className={cls}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", dot)} />
      {verdict}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-acid"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-ink-500 mb-4">{icon}</div>
      <p className="font-display font-semibold text-ink-200 text-lg mb-1">{title}</p>
      {description && <p className="text-ink-400 text-sm mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer h-4", className)} />;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={clsx("card", accent && "border-acid/30 bg-acid/5")}>
      <p className="label">{label}</p>
      <p
        className={clsx(
          "font-display font-bold text-3xl",
          accent ? "text-acid" : "text-ink-50"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-ink-400 text-xs mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative w-10 h-5 rounded-full transition-colors duration-200",
          checked ? "bg-acid" : "bg-ink-600"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
            checked && "translate-x-5"
          )}
        />
      </button>
      {label && <span className="text-sm text-ink-300">{label}</span>}
    </label>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-800/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-ink-50">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-ink-400">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-mono transition-all duration-150",
              selected
                ? "bg-acid text-ink-800 font-semibold"
                : "bg-ink-700 text-ink-300 hover:bg-ink-600 border border-ink-600"
            )}
          >
            {opt.label}
          </button>
        );
      })}
      {options.length === 0 && (
        <span className="text-xs text-ink-500">{placeholder ?? "No options"}</span>
      )}
    </div>
  );
}
