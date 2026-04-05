import React from 'react';
import styles from './FormField.module.css';

interface FormFieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, helper, error, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {helper && <div className={styles.helper}>{helper}</div>}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}