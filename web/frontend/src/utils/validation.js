export const FIELD_LABEL_MAP = {
  name: 'Project Name',
  description: 'Description',
  username: 'Username',
  given_name: 'First Name',
  family_name: 'Surname',
  affiliation: 'Affiliation',
  email: 'Email',
  schema_name: 'Schema Name',
  password_key: 'Password Key',
  username_key: 'Username Key',
  provider: 'Provider',
  datatype: 'Data Type',
  source: 'Source',
  destination: 'Destination',
  credentials: 'Credentials',
  url: 'URL',
};

export function formatErrorMessage(msg) {
  if (!msg) return '';
  let result = msg;
  Object.entries(FIELD_LABEL_MAP).forEach(([key, label]) => {
    result = result.replace(new RegExp(`'${key}'`, 'g'), `'${label}'`);
  });
  result = result.replace(/_/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function applyFormatToErrorSchema(errorSchema) {
  if (!errorSchema || typeof errorSchema !== 'object') return errorSchema;
  const out = {};
  for (const [k, v] of Object.entries(errorSchema)) {
    out[k] = k === '__errors' ? v.map(formatErrorMessage) : applyFormatToErrorSchema(v);
  }
  return out;
}

export function deepMergeErrors(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (key === '__errors') {
      result.__errors = [...(target.__errors || []), ...(source.__errors || [])];
    } else if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMergeErrors(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function hasAnyErrors(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.__errors && obj.__errors.length > 0) return true;
  return Object.values(obj).some(v => hasAnyErrors(v));
}
