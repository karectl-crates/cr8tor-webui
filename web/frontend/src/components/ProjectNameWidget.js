import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { PROJECT_NAME_PATTERN } from '../utils/constants';

export default function ProjectNameWidget({
  id, value, onChange, onBlur, onFocus,
  label, required, disabled, readonly, autofocus, rawErrors
}) {
  const [dirty, setDirty] = useState(false);
  const uniqueRawErrors = rawErrors ? [...new Set(rawErrors)] : [];
  const isPatternInvalid = !!value && !PROJECT_NAME_PATTERN.test(value);
  const hasExternalError = uniqueRawErrors && uniqueRawErrors.length > 0;
  const showError = (dirty && isPatternInvalid) || hasExternalError;
  const errorMsg = isPatternInvalid
    ? 'Lowercase letters, numbers and hyphens only. No spaces.'
    : (hasExternalError ? uniqueRawErrors[0] : ' ');

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
      helperText={showError ? errorMsg : ' '}
      placeholder="e.g. my-project-2025"
      variant="outlined"
    />
  );
}
