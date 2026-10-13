import type { ReactNode } from 'react';
import type { ValidationIssue } from '../core/validation';

interface ValidatedFieldProps {
  label: string;
  fieldKey: string;
  issues?: ValidationIssue[];
  children: ReactNode;
}

export default function ValidatedField({
  label,
  fieldKey,
  issues = [],
  children,
}: ValidatedFieldProps) {
  const error = issues.find(issue => issue.severity === 'error');
  const warning = issues.find(issue => issue.severity === 'warning');
  const issue = error ?? warning;

  return (
    <div
      className="onyx-validated-input"
      data-validation-field={fieldKey}
      data-severity={issue?.severity ?? 'valid'}
    >
      <label style={{ display: 'block', marginBottom: 7 }}>
        <span style={{ display: 'block', marginBottom: 7 }}>
          {label}
        </span>
        {children}
      </label>

      {issue && (
        <p
          className={`onyx-inline-message ${issue.severity}`}
          role={issue.severity === 'error' ? 'alert' : 'status'}
        >
          {issue.severity === 'error' ? '⚠' : 'ⓘ'}{' '}
          {issue.message}
        </p>
      )}
    </div>
  );
}
