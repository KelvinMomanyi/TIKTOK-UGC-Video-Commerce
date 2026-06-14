export function StatusBadge({ status }: { status: string }) {
  const tone = status === "READY" || status === "PUBLISHED" || status === "ACTIVE"
    ? "success"
    : status === "FAILED" || status === "CANCELED"
      ? "critical"
      : "warning";

  return <span className={`tvc-badge tvc-badge--${tone}`}>{status.replace(/_/g, " ").toLowerCase()}</span>;
}
