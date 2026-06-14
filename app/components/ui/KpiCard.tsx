export function KpiCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string | number;
  meta?: string;
  tone?: "success" | "warning" | "critical";
}) {
  return (
    <div className="tvc-card">
      <div className="tvc-card__body tvc-kpi">
        <div className="tvc-row">
          <span className="tvc-kpi__label">{label}</span>
          {tone ? <span className={`tvc-badge tvc-badge--${tone}`}>{tone}</span> : null}
        </div>
        <strong className="tvc-kpi__value">{value}</strong>
        {meta ? <span className="tvc-kpi__meta">{meta}</span> : null}
      </div>
    </div>
  );
}
