import React, { useState, useEffect } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import {
  Container, Card, CardContent, Box, Typography, Button,
  CircularProgress, TextField, Alert, Snackbar
} from '@mui/material';
import api from '../api';
import { DEFAULT_DEPLOYMENT } from '../defaults';
import { WIZARD_STEPS, PROJECT_NAME_PATTERN } from '../utils/constants';
import { formatErrorMessage, applyFormatToErrorSchema, deepMergeErrors, hasAnyErrors } from '../utils/validation';
import { extractStepSchema } from '../utils/schemaHelpers';
import { customUiSchema } from '../config/uiSchema';
import ProjectNameWidget from './ProjectNameWidget';
import '../users-box.css';

const Form = withTheme(MaterialUITheme);

export default function WizardPage({ onSubmitSuccess }) {
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
            Step {step+1} of {WIZARD_STEPS.length}: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}
          </Typography>
          {submitError && <Box color="error.main" mb={2}>{submitError}</Box>}
        <Typography align="left" gutterBottom>
            To create and provision a project, please fill in the required governance, data flow and deployment information. Once submitted, pull request will be created on your target projects repo for relevant stakeholder review. Ensure your github credentials are specified in settings.
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
