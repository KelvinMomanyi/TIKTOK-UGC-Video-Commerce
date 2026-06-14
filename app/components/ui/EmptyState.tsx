import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="tvc-empty">
      <div className="tvc-stack">
        <div>
          <h3>{title}</h3>
          <p>{children}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
