import { useState } from "react";

type CopyFieldProps = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function CopyField({ label, value, multiline = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="tvc-copy-field">
      <label className="tvc-label">
        {label}
        {multiline ? (
          <textarea
            className="tvc-textarea tvc-copy-field__control"
            value={value}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        ) : (
          <input
            className="tvc-input tvc-copy-field__control"
            value={value}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </label>
      <button className="tvc-button" type="button" onClick={copyValue}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
