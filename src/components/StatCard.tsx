/**
 * A single headline number with a label under it.
 *
 * When the only thing worth showing is one number, a chart is the wrong
 * shape - a big readable figure beats a bar of length one.
 */
export default function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}
