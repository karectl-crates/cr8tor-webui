import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { PROJECT_NAME_PATTERN } from '../utils/constants';

export default function ProjectNameWidget({
  id, value, onChange, onBlur, onFocus,
  label, required, disabled, readonly, autofocus, rawErrors
}) {
  const [dirty, setDirty] = useState(false);
  const hasExternalError = rawErrors && rawErrors.length > 0;
  const isPatternInvalid = !!value && !PROJECT_NAME_PATTERN.test(value);
  const showPatternError = dirty && isPatternInvalid;
  const showError = showPatternError || hasExternalError;

  return (
    <TextField
      id={id}
      fullWidth
      label={label}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      autoFocus={autofocus}
      value={value || ''}
      onChange={(e) => { setDirty(true); onChange(e.target.value); }}
      onBlur={(e) => { setDirty(true); onBlur(id, e.target.value); }}
      onFocus={(e) => onFocus(id, e.target.value)}
      error={showError}
      helperText={showPatternError ? 'Lowercase letters, numbers and hyphens only. No spaces.' : undefined}
      placeholder="e.g. my-project-2025"
      variant="outlined"
    />
  );
}
