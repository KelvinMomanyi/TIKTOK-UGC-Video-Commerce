import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="tvc-header">
      <div>
        {eyebrow ? <p className="tvc-eyebrow">{eyebrow}</p> : null}
        <h1 className="tvc-title">{title}</h1>
        {subtitle ? <p className="tvc-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="tvc-actions">{actions}</div> : null}
    </div>
  );
}
