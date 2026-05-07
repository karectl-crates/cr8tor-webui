import React, { useState, useEffect, useRef } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import api from './api';
import {
  CssBaseline, AppBar, Toolbar, Typography, Button, CircularProgress,
  Container, Card, CardContent, Box, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, Alert, Snackbar
} from '@mui/material';
import './users-box.css';
import { DEFAULT_DEPLOYMENT, RESOURCE_TYPES } from './defaults';

const Form = withTheme(MaterialUITheme);

const WIZARD_STEPS = ['governance', 'ingress', 'deployment'];

const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const FIELD_LABEL_MAP = {
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

function formatErrorMessage(msg) {
  if (!msg) return '';
  let result = msg;
  Object.entries(FIELD_LABEL_MAP).forEach(([key, label]) => {
    result = result.replace(new RegExp(`'${key}'`, 'g'), `'${label}'`);
  });
  result = result.replace(/_/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function applyFormatToErrorSchema(errorSchema) {
  if (!errorSchema || typeof errorSchema !== 'object') return errorSchema;
  const out = {};
  for (const [k, v] of Object.entries(errorSchema)) {
    out[k] = k === '__errors' ? v.map(formatErrorMessage) : applyFormatToErrorSchema(v);
  }
  return out;
}

function deepMergeErrors(target, source) {
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

function hasAnyErrors(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.__errors && obj.__errors.length > 0) return true;
  return Object.values(obj).some(v => hasAnyErrors(v));
}

function ProjectNameWidget({
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

const customUiSchema = {
  governance: {
    project: {
      id: { "ui:widget": "hidden" },
      name: {
        "ui:title": "Project Name",
        "ui:widget": "ProjectNameWidget",
        "ui:description": "",
        "ui:hideError": true,
      },
      reference: { "ui:title": "Reference" },
      description: { "ui:title": "Description" },
      start_time: { "ui:widget": "hidden" },
      actions: { "ui:widget": "hidden" }
    },
    users: {
      "ui:title": "Users",
      items: {
        "ui:classNames": "users-box",
        id: { "ui:widget": "hidden" },
        groups: { "ui:widget": "hidden" },
        "given_name": { "ui:title": "First Name" },
        "family_name": { "ui:title": "Surname" },
        password: { "ui:title": "Password", "ui:widget": "password" },
        enabled: { "ui:title": "Enabled" },
        affiliation: { "ui:title": "Affiliation" },
        email: { "ui:title": "Email" },
        username: { "ui:title": "Username" },
      }
    }
  },
  ingress: {
    source: {
      "ui:title": "Source",
      name: { "ui:title": "Name" },
      type: { "ui:title": "Source Type" },
      url: { "ui:title": "URL" },
      credentials: {
        "ui:title": "Credentials",
        provider: { "ui:title": "Provider" },
        password_key: { "ui:title": "Password Key" },
        username_key: { "ui:title": "Username Key" },
      }
    },
    destination: {
      "ui:title": "Destination",
      type: { "ui:title": "Destination Type" },
      url: { "ui:title": "URL" },
    },
    datasets: {
      "ui:title": "Datasets",
      items: {
        "ui:classNames": "users-box",
        "ui:title": "Dataset",
        name: { "ui:title": "Name" },
        schema_name: { "ui:title": "Schema Name" },
        tables: {
          "ui:title": "Tables",
          items: {
            "ui:classNames": "users-box",
            "ui:title": "Table",
            name: { "ui:title": "Name" },
            columns: {
              "ui:title": "Columns",
              items: {
                "ui:classNames": "users-box",
                "ui:title": "Column",
                name: { "ui:title": "Name" },
                datatype: { "ui:title": "Data Type" },
              }
            }
          }
        },
        locations: { "ui:widget": "hidden" }
      }
    }
  },
  deployment: {
    resources: {
      "ui:title": "Resources",
      items: {
        resource_type: { "ui:widget": "hidden" },
        profiles:      { "ui:widget": "hidden" },
        clients:       { "ui:widget": "hidden" },
        // VDI-specific fields managed by the operator
        user:          { "ui:widget": "hidden" },
        project:       { "ui:widget": "hidden" },
        image:         { "ui:widget": "hidden" },
        connection:    { "ui:widget": "hidden" },
        "ui:options": {
          anyOfTitles: RESOURCE_TYPES
        }
      }
    }
  }
};

function extractStepSchema(schema, step) {
  if (!schema || !schema.properties || !schema.$defs) return null;
  const stepDef = schema.properties[step]?.$ref;
  if (!stepDef) return null;
  const defName = stepDef.split('/').pop();
  const stepSchema = {
    ...schema.$defs[defName],
    definitions: schema.$defs,
  };

  function patchRefs(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    for (const key in obj) {
      if (key === '$ref' && typeof obj[key] === 'string' && obj[key].startsWith('#/$defs/')) {
        obj[key] = obj[key].replace('#/$defs/', '#/definitions/');
      } else {
        patchRefs(obj[key]);
      }
    }
  }
  patchRefs(stepSchema);
  return stepSchema;
}

function SettingsPage() {
  const [org, setOrg] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [repo, setRepo] = useState("");
  const [approvalsHost, setApprovalsHost] = useState("");
  const [approvalsPort, setApprovalsPort] = useState("");
  const [approvalsApiToken, setApprovalsApiToken] = useState("");
  const [status, setStatus] = useState("");
  const [validation, setValidation] = useState("");
  useEffect(() => {
    api.get('/cr8tor-settings')
      .then(res => {
        if (res.data) {
          setOrg(res.data.GITHUB_ORG || "");
          setGhToken(res.data.GH_TOKEN || "");
          setRepo(res.data.GITHUB_REPO || "");
          setApprovalsHost(res.data.APPROVALS_HOST || "");
          setApprovalsPort(res.data.APPROVALS_PORT || "");
          setApprovalsApiToken(res.data.APPROVALS_API_TOKEN || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setStatus("");
    setValidation("");
    try {
      await api.post('/set_github_settings', {
        github_org: org,
        gh_token: ghToken,
        github_repo: repo,
        approvals_host: approvalsHost,
        approvals_port: approvalsPort,
        approvals_api_token: approvalsApiToken
      });
      setStatus("Settings updated successfully.");
    } catch (err) {
      setStatus("Failed to update settings: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleValidate = async () => {
    setValidation("");
    try {
      const res = await api.post('/validate_github_settings', {
        github_org: org,
        gh_token: ghToken,
        github_repo: repo,
        approvals_host: approvalsHost,
        approvals_port: approvalsPort,
        approvals_api_token: approvalsApiToken
      });
      setValidation(res.data.message);
    } catch (err) {
      setValidation("Validation failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Card elevation={3} sx={{ maxWidth: 900, margin: '0 auto' }}>
        <CardContent>
          <Typography variant="h4" color="text.secondary" align="center" gutterBottom>
            Settings
          </Typography>
          <Box component="form" onSubmit={handleUpdate} sx={{ mt: 3 }}>
            <Box mb={2}>
              <Typography sx={{ fontWeight: 'bold' }}>Cr8tor GitHub</Typography>
              <input
                type="text"
                value={org}
                onChange={e => setOrg(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
                placeholder="Github Organisation e.g. karectl-crates"
              />
            </Box>
            <Box mb={2}>
              <input
                type="text"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
                placeholder="Projects Repository e.g. cr8tor-projects"
              />
            </Box>
            <Box mb={2}>
              <input
                type="password"
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
                placeholder="Github Token"
              />
            </Box>
            <Box mb={2}>
              <Typography sx={{ fontWeight: 'bold' }}>Cr8tor Cluster Service (Optional)</Typography>
              <input
                type="text"
                value={approvalsHost}
                onChange={e => setApprovalsHost(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
              
                placeholder="Host e.g. https://cr8tor.k8tre.org"
              />
            </Box>
            <Box mb={2}>
              <input
                type="text"
                value={approvalsPort}
                onChange={e => setApprovalsPort(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
           
                placeholder="Port e.g. 80"
              />
            </Box>
            <Box mb={2}>
              <input
                type="password"
                value={approvalsApiToken}
                onChange={e => setApprovalsApiToken(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
              
                placeholder="Auth Token"
              />
            </Box>

            <Box display="flex" gap={2} alignItems="center">
              <Button type="submit" variant="contained" color="primary">Update</Button>
              <Button type="button" variant="outlined" color="secondary" onClick={handleValidate}>Validate Credentials</Button>
            </Box>
            {status && <Box mt={2} color={status.startsWith('Failed') ? 'error.main' : 'success.main'}>{status}</Box>}
            {validation && <Box mt={2} color={validation.startsWith('GitHub credentials are valid') ? 'success.main' : 'error.main'}>{validation}</Box>}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

function WizardPage({ onSubmitSuccess }) {
  const [schema, setSchema] = useState(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ deployment: DEFAULT_DEPLOYMENT });
  const [limitRange, setLimitRange] = useState(DEFAULT_DEPLOYMENT.limit_range);
  const [formKey, setFormKey] = useState(0); // force re-render
  const [extraErrors, setExtraErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationSnackbar, setShowValidationSnackbar] = useState(false);
  // const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    api.get('/schema/class/cr8tor')
      .then(res => {
        setSchema(res.data);
        setError(null);
      })
      .catch(err => {
        setError('Failed to load schema: ' + err.message);
      });
  }, []);

  if (error) return <Box color="error.main">{error}</Box>;
  if (!schema) return <Box>Loading schema...</Box>;

  const currentStep = WIZARD_STEPS[step];
  const rawStepSchema = extractStepSchema(schema, currentStep);
  const stepSchema = (currentStep === 'deployment' && rawStepSchema?.properties)
    ? { ...rawStepSchema, properties: (({ limit_range, ...rest }) => rest)(rawStepSchema.properties) }
    : rawStepSchema;

  const destType = formData?.ingress?.destination?.type;
  const ingressUiSchema = {
    ...customUiSchema.ingress,
    source: {
      ...customUiSchema.ingress.source,
      credentials: {
        "ui:title": "Credentials",
        provider: { "ui:title": "Provider" },
        password_key: { "ui:title": "Password Key" },
        username_key: { "ui:title": "Username Key" },
      }
    },
    destination: {
      ...customUiSchema.ingress.destination,
      url: destType === 'filestore'
        ? { "ui:widget": "hidden" }
        : { "ui:title": "URL" },
    }
  };

  const stepUiSchema = currentStep === 'ingress' ? ingressUiSchema : (customUiSchema[currentStep] || {});

  const handleNext = () => {
    const currentData = formData[currentStep] || {};

    if (currentStep === 'governance') {
      // Run email format check first, store separately
      const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const users = currentData?.users || [];
      const emailErrors = {};
      users.forEach((user, idx) => {
        if (user?.email && !EMAIL_PATTERN.test(user.email)) {
          emailErrors[idx] = { email: { __errors: ['Please enter a valid email address'] } };
        }
      });

      // AJV validation
      const schemaValidation = validator.validateFormData(currentData, stepSchema);
      const schemaErrorSchema = applyFormatToErrorSchema(schemaValidation.errorSchema || {});

      // Project name pattern check
      const projectName = currentData?.project?.name || '';
      let patternErrors = {};
      if (projectName && !PROJECT_NAME_PATTERN.test(projectName)) {
        patternErrors = {
          project: { name: { __errors: ['Lowercase letters, numbers and hyphens only. No spaces.'] } }
        };
      }

      // Merge AJV errors, pattern errors, then email errors (email never overwritten)
      const mergedErrors = { ...schemaErrorSchema, ...patternErrors };
      if (Object.keys(emailErrors).length > 0) {
        const baseUsers = mergedErrors.users || {};
        const mergedUsers = { ...baseUsers };
        Object.entries(emailErrors).forEach(([idx, errObj]) => {
          mergedUsers[idx] = { ...(mergedUsers[idx] || {}), ...errObj };
        });
        mergedErrors.users = mergedUsers;
      }

      const hasErrors =
        (schemaValidation.errors && schemaValidation.errors.length > 0) ||
        Object.keys(patternErrors).length > 0 ||
        Object.keys(emailErrors).length > 0;

      if (hasErrors) {
        setExtraErrors(mergedErrors);
        setFormKey(k => k + 1);
        setShowValidationSnackbar(true);
        return;
      }

      setExtraErrors({});
      setStep(step + 1);
      return;
    }

    // Conditional: destination.url required when type is postgresql
    const destination = currentData?.destination || {};
    let conditionalErrors = {};
    if (destination.type === 'postgresql' && !destination.url) {
      conditionalErrors = {
        destination: {
          url: { __errors: ['URL is required when Destination Type is postgresql'] }
        }
      };
    }

    // If destination is postgresql, at least one dataset is required and each must have tables/columns
    if (destination.type === 'postgresql') {
      const datasets = currentData?.datasets || [];

      if (datasets.length === 0) {
        conditionalErrors._datasetsRequired = {
          __errors: ['At least one dataset is required when Destination Type is postgresql']
        };
      }

      if (datasets.length > 0) datasets.forEach((dataset, dIdx) => {
        if (!dataset.tables || dataset.tables.length === 0) {
          if (!conditionalErrors.datasets) conditionalErrors.datasets = {};
          conditionalErrors.datasets[dIdx] = {
            tables: { __errors: ['At least one table is required for postgresql datasets'] }
          };
        } else {
          // Each table must have at least one column
          dataset.tables.forEach((table, tIdx) => {
            if (!table.columns || table.columns.length === 0) {
              if (!conditionalErrors.datasets) conditionalErrors.datasets = {};
              if (!conditionalErrors.datasets[dIdx]) conditionalErrors.datasets[dIdx] = {};
              if (!conditionalErrors.datasets[dIdx].tables) conditionalErrors.datasets[dIdx].tables = {};
              conditionalErrors.datasets[dIdx].tables[tIdx] = {
                columns: { __errors: ['At least one column is required per table'] }
              };
            }
          });
        }
      });
    }

    const validation = validator.validateFormData(currentData, stepSchema);

    const hasConditionalErrors = hasAnyErrors(conditionalErrors);
    if ((validation.errors && validation.errors.length > 0) || hasConditionalErrors) {
      const formatted = applyFormatToErrorSchema(validation.errorSchema || {});
      const mergedErrors = deepMergeErrors(formatted, conditionalErrors);
      setExtraErrors(mergedErrors);
      setFormKey(k => k + 1);
      setShowValidationSnackbar(true);
      return;
    }

    setExtraErrors({});
    setStep(step + 1);
  };

  const handleFormChange = ({formData: rawData}) => {
    let data = rawData;
    if (currentStep === 'ingress') {
      const newDestType = data?.destination?.type;
      const oldDestType = formData?.ingress?.destination?.type;
      if (newDestType === 'filestore' && oldDestType !== 'filestore') {
        data = {
          ...data,
          destination: { ...data.destination, url: undefined }
        };
      }
    }
    setFormData(prev => ({ ...prev, [currentStep]: data }));
    if (Object.keys(extraErrors).length > 0) {
      setExtraErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };


  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
  
    try {
      const settingsRes = await api.get('/cr8tor-settings');
      const github_org = settingsRes.data.GITHUB_ORG;
      const gh_token = settingsRes.data.GH_TOKEN;
      const github_repo = settingsRes.data.GITHUB_REPO;
      const approvals_host = settingsRes.data.APPROVALS_HOST;
      const approvals_port = settingsRes.data.APPROVALS_PORT;
      const approvals_api_token = settingsRes.data.APPROVALS_API_TOKEN;

      const validateRes = await api.post('/validate_github_settings', {
        github_org,
        gh_token,
        github_repo,
        approvals_host,
        approvals_port,
        approvals_api_token
      });

      if (!validateRes.data.valid) {
        setSubmitError(validateRes.data.message || "Invalid GitHub settings.");
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      setSubmitError("Could not validate GitHub settings: " + (err.response?.data?.detail || err.message));
      setIsSubmitting(false);
      return;
    }
    
    const cr8torObj = {
      governance: formData.governance,
      ingress: formData.ingress,
      deployment: { ...formData.deployment, limit_range: limitRange }
    };


    // const cr8torObj = {
    //     "governance": {
    //         "project": {
    //         "name": "headaches",
    //         "description": "Project about headaches",
    //         "start_time": "324",
    //         "actions": []
    //         },
    //         "users": [
    //         {
    //             "id": "234d",
    //             "username": "hardingm",
    //             "given_name": "mike",
    //             "family_name": "harding",
    //             "affiliation": "Lancaster university",
    //             "email": "mike@gg.com",
    //             "groups": [],
    //             "enabled": true,
    //             "password": "werfweq"
    //         }
    //         ]
    //     },
    //     "ingress": {
    //         "source": {
    //         "name": "opal-resource-db",
    //         "type": "postgresql",
    //         "url": "datashield-postgres-cluster-rw.datashield.svc.cluster.local",
    //         "credentials": {
    //             "provider": "AzureKeyVault",
    //             "password_key": "opal-resource-db-password",
    //             "username_key": "opal-resource-db-username"
    //         }
    //         },
    //         "destination": {
    //         "type": "postgresql",
    //         "url": "sadffdav"
    //         },
    //         "datasets": [
    //         {
    //             "name": "myXYZDataset",
    //             "schema_name": "public",
    //             "tables": [
    //             {
    //                 "name": "xyz_source",
    //                 "columns": [
    //                 { "name": "id", "datatype": "UUID" },
    //                 { "name": "value", "datatype": "VARCHAR" }
    //                 ]
    //             }
    //             ],
    //             "locations": []
    //         }
    //         ]
    //     },
    //     "deployment": {
    //         "resources": [],
    //         "environment": { "name": "tre-dev" }
    //     }
    //     };

    
    api.post('/submit', cr8torObj)
      .then((res) => {
        setSubmitError("");
        if (onSubmitSuccess) onSubmitSuccess(res.data);
      })
      .catch(err => {
        setSubmitError('Submission failed: ' + (err.response?.data?.detail || err.message));
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5}}>
      <Card elevation={3} sx={{ maxWidth: 900, margin: '0 auto' }}>
        <CardContent>
          <Typography variant="h4" color="primary" align="center" gutterBottom>
            Create Project
          </Typography>
          <Typography align="center" sx={{ mb: 2 }}>
            Step {step+1} of {WIZARD_STEPS.length}: {currentStep}
          </Typography>
          {submitError && <Box color="error.main" mb={2}>{submitError}</Box>}
        <Typography align="left" gutterBottom>
            To create and provision a project, please fill in the required governance, data flow and deployment information. Once submitted, pull request will be created on your target projects repo for relevant stakeholder review. Ensure your github crednetials specified in settings.
          </Typography>
          <Form
            key={`${formKey}-${step}`}
            schema={stepSchema}
            uiSchema={stepUiSchema}
            validator={validator}
            formData={currentStep === 'deployment'
              ? (({ limit_range, ...rest }) => rest)(formData[currentStep] || {})
              : (formData[currentStep] || {})}
            onChange={handleFormChange}
            onSubmit={step === WIZARD_STEPS.length-1 ? handleSubmit : undefined}
            liveValidate={false}
            noHtml5Validate={true}
            showErrorList={false}
            extraErrors={extraErrors}
            transformErrors={(errors) => errors.map(err => ({ ...err, message: formatErrorMessage(err.message) }))}
            widgets={{ ProjectNameWidget }}
          >
            {currentStep === 'deployment' && (
              <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Namespace Resource Limits (LimitRange)
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {[
                    { key: 'default_memory', label: 'Default Memory Limit', placeholder: 'e.g. 4Gi' },
                    { key: 'default_cpu', label: 'Default CPU Limit', placeholder: 'e.g. 500m' },
                    { key: 'default_request_memory', label: 'Default Memory Request', placeholder: 'e.g. 1Gi' },
                    { key: 'default_request_cpu', label: 'Default CPU Request', placeholder: 'e.g. 100m' },
                  ].map(({ key, label, placeholder }) => (
                    <TextField
                      key={key}
                      label={label}
                      placeholder={placeholder}
                      value={limitRange?.[key] || ''}
                      onChange={e => setLimitRange(prev => ({ ...prev, [key]: e.target.value }))}
                      size="small"
                      sx={{ flex: '1 1 180px' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {currentStep === 'ingress' && extraErrors._datasetsRequired?.__errors?.[0] && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {extraErrors._datasetsRequired.__errors[0]}
              </Alert>
            )}
            <Box display="flex" justifyContent="space-between" mt={2}>
              {step > 0 && <Button variant="outlined" onClick={handleBack}>Back</Button>}
              <Button
                type="button"
                variant="contained"
                onClick={step < WIZARD_STEPS.length-1 ? handleNext : handleSubmit}
                disabled={isSubmitting}
                startIcon={isSubmitting && step === WIZARD_STEPS.length-1 ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {step < WIZARD_STEPS.length-1 ? 'Next' : 'Submit'}
              </Button>
            </Box>
          </Form>
          <Snackbar
            open={showValidationSnackbar}
            autoHideDuration={4000}
            onClose={() => setShowValidationSnackbar(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert severity="error" onClose={() => setShowValidationSnackbar(false)}>
              Please fill in all required fields before continuing.
            </Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Container>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [prStatuses, setPrStatuses] = useState({});
  const [triggered, setTriggered] = useState({});
  const [loadError, setLoadError] = useState(null);
  const intervalRef = useRef(null);

  const pollStatuses = (projectList, isMounted) => {
    projectList.forEach(project => {
      if (!project.pr_number) return;
      api.get(`/projects/${project.name}/pr-status`)
        .then(res => { if (isMounted.current) setPrStatuses(prev => ({ ...prev, [project.name]: res.data })); })
        .catch(err => console.warn(`PR status failed for ${project.name}:`, err.message));
    });
  };
  useEffect(() => {
    const isMounted = { current: true };
    clearInterval(intervalRef.current);
    api.get('/projects')
      .then(res => {
        if (!isMounted.current) return;
        const data = res.data || [];
        setProjects(data);
        if (data.length > 0) {
          pollStatuses(data, isMounted);
          intervalRef.current = setInterval(() => pollStatuses(data, isMounted), 10000);
        }
      })
      .catch(err => { if (isMounted.current) setLoadError(err.message); });
    return () => {
      isMounted.current = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleTrigger = (name) => {
    api.post(`/projects/${name}/trigger`)
      .then(res => setTriggered(prev => ({ ...prev, [name]: res.data.triggered })))
      .catch(err => {
        console.warn('Trigger failed:', err.message);
        setTriggered(prev => ({ ...prev, [name]: false }));
      });
  };

  const prChip = (name) => {
    const prStatus = prStatuses[name];
    if (!prStatus) return <Chip label="Polling..." size="small" />;
    if (prStatus.merged) return <Chip label="Merged" color="success" size="small" />;
    if (prStatus.state === 'open') return <Chip label="Open" color="primary" size="small" />;
    if (prStatus.state === 'closed') return <Chip label="Closed" size="small" />;
    return <Chip label="Unknown" size="small" />;
  };

  const rowActions = (project) => {
    const prStatus = prStatuses[project.name];
    const prUrl = prStatus?.pr_url || project.pr_url;
    if (!prStatus) {
      return prUrl ? <Button size="small" href={prUrl} target="_blank" rel="noopener noreferrer">View PR</Button> : null;
    }
    if (prStatus.merged) {
      if (triggered[project.name]) {
        return (
          <Box display="flex" gap={1} alignItems="center">
            <Chip label="Pipeline triggered" color="success" size="small" />
            <Button
              size="small"
              href={`https://github.com/${project.github_org}/${project.github_repo}/actions`}
              target="_blank"
              rel="noopener noreferrer"
            >View Actions</Button>
          </Box>
        );
      }
      if (triggered[project.name] === false) {
        return <Chip label="Trigger failed" color="error" size="small" />;
      }
      return <Button size="small" variant="contained" color="success" onClick={() => handleTrigger(project.name)}>Run Pipeline</Button>;
    }
    return prUrl ? <Button size="small" href={prUrl} target="_blank" rel="noopener noreferrer">View PR</Button> : null;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Card elevation={3} sx={{ maxWidth: 900, margin: '0 auto' }}>
        <CardContent>
          <Typography variant="h4" color="text.secondary" align="center" gutterBottom>
            Projects
          </Typography>
          {loadError && <Box color="error.main" mb={2}>{loadError}</Box>}
          {projects.length === 0 ? (
            <Typography align="center" color="text.secondary">No submitted projects yet.</Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Project Name</strong></TableCell>
                    <TableCell><strong>Submitted</strong></TableCell>
                    <TableCell><strong>PR Status</strong></TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map(project => (
                    <TableRow key={project.name}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.submitted_at ? new Date(project.submitted_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{prChip(project.name)}</TableCell>
                      <TableCell>{rowActions(project)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleSubmitSuccess = () => {
    setActiveTab(2);
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Cr8torGov
          </Typography>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="inherit" indicatorColor="secondary">
            <Tab label="Create Project" />
            <Tab label="Settings" />
            <Tab label="Projects" />
          </Tabs>
        </Toolbar>
      </AppBar>
      {activeTab === 0 && <WizardPage onSubmitSuccess={handleSubmitSuccess} />}
      {activeTab === 1 && <SettingsPage />}
      {activeTab === 2 && <ProjectsPage />}
    </>
  );
}

export default App;
