import React, { useState, useEffect } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import axios from 'axios';
import { CssBaseline, AppBar, Toolbar, Typography, Button, Container, Card, CardContent, Box, Tabs, Tab } from '@mui/material';
import ArrayFieldTemplate from './ArrayFieldTemplate';
import './users-box.css';

const Form = withTheme(MaterialUITheme);

const WIZARD_STEPS = ['governance', 'ingress', 'deployment'];

const API_URL = 'http://localhost:8000/api';

const customUiSchema = {
  governance: {
    project: {
      id: { "ui:widget": "hidden" },
      name: { "ui:title": "Name" },
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
    datasets: {
      "ui:title": "Datasets",
      items: {
        "ui:classNames": "users-box",
        "ui:title": "Dataset",
        name: { "ui:title": "Name" },
        tables: {
          "ui:title": "Tables",
          items: {
            "ui:classNames": "users-box",
            "ui:title": "Table",
            columns: { "ui:title": "Columns" }
          }
        },
        locations: { "ui:widget": "hidden" }
      }
    }
  },
  deployment: {}
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
  //const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    axios.get(`${API_URL}/cr8tor-settings`)
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
  }, [API_URL]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setStatus("");
    setValidation("");
    try {
      await axios.post(`${API_URL}/set_github_settings`, {
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
      const res = await axios.post(`${API_URL}/validate_github_settings`, {
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
              <Typography>GitHub Organisation Name</Typography>
              <input
                type="text"
                value={org}
                onChange={e => setOrg(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={2}>
              <Typography>GitHub Token (GH_TOKEN)</Typography>
              <input
                type="password"
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={2}>
              <Typography>Approvals Host</Typography>
              <input
                type="text"
                value={approvalsHost}
                onChange={e => setApprovalsHost(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={2}>
              <Typography>Approvals Port</Typography>
              <input
                type="text"
                value={approvalsPort}
                onChange={e => setApprovalsPort(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={2}>
              <Typography>Approvals API Token</Typography>
              <input
                type="password"
                value={approvalsApiToken}
                onChange={e => setApprovalsApiToken(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={2}>
              <Typography>GitHub Projects Repository Name</Typography>
              <input
                type="text"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
                required
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

function WizardPage() {
  const [schema, setSchema] = useState(null);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState(null);
  const [formData, setFormData] = useState({});
  const [formKey, setFormKey] = useState(0); // force re-render
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const API_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    axios.get(`${API_URL}/schema/class/cr8tor`)
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
  const stepSchema = extractStepSchema(schema, currentStep);
  const stepUiSchema = customUiSchema[currentStep] || {};

  const handleNext = () => {
    const currentData = formData[currentStep] || {};
    const validation = validator.validateFormData(currentData, stepSchema);

    console.log(validation.errors);

    if (validation.errors && validation.errors.length > 0) {
      const missingFields = validation.errors
        .map(e => {
          if (e.property) {
            return e.property.replace(/^\./, '');
          }
          if (Array.isArray(e.name)) {
            return e.name.join('.');
          }
          return '';
        })
        .filter(Boolean);
      
      const msg = missingFields.length > 0
        ? `Please fill in: ${missingFields.join(', ')}`
        : 'Please fill in all required fields.';
      setStepError(msg);
      setFormKey(k => k + 1);
      return;
    }
    
    setStepError(null);
    setStep(step + 1);
  };

  const handleFormChange = ({formData: data}) => {
    setFormData(prev => ({ ...prev, [currentStep]: data }));
  };

  const handleBack = () => {
    setStep(step - 1);
  };


  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
  
    try {
      const settingsRes = await axios.get(`${API_URL}/cr8tor-settings`);
      const github_org = settingsRes.data.GITHUB_ORG;
      const gh_token = settingsRes.data.GH_TOKEN;
      const github_repo = settingsRes.data.GITHUB_REPO;
      const approvals_host = settingsRes.data.APPROVALS_HOST;
      const approvals_port = settingsRes.data.APPROVALS_PORT;
      const approvals_api_token = settingsRes.data.APPROVALS_API_TOKEN;

      
      const validateRes = await axios.post(`${API_URL}/validate_github_settings`, {
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
      deployment: formData.deployment
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

    
    axios.post(`${API_URL}/submit`, cr8torObj)
      .then(() => {
        alert('Submitted successfully!');
        setSubmitError("");
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
          {stepError && <Box color="error.main" mb={2}>{stepError}</Box>}
          {submitError && <Box color="error.main" mb={2}>{submitError}</Box>}
        <Typography align="left" gutterBottom>
            To create and provision a project, please fill in the required governance, data flow and deployment information. Once submitted, pull request will be created on your target projects repo for relevant stakeholder review. Ensure your github crednetials specified in settings.
          </Typography>
          <Form
            key={`${formKey}-${step}`}
            schema={stepSchema}
            uiSchema={stepUiSchema}
            validator={validator}
            formData={formData[currentStep] || {}}
            onChange={handleFormChange}
            onSubmit={step === WIZARD_STEPS.length-1 ? handleSubmit : undefined}
            liveValidate={false}
            noHtml5Validate={true}
          >
            <Box display="flex" justifyContent="space-between" mt={2}>
              {step > 0 && <Button variant="outlined" onClick={handleBack}>Back</Button>}
              <Button type="button" variant="contained" onClick={step < WIZARD_STEPS.length-1 ? handleNext : handleSubmit} disabled={isSubmitting}>
                {step < WIZARD_STEPS.length-1 ? 'Next' : isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </Box>
          </Form>
        </CardContent>
      </Card>
    </Container>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
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
          </Tabs>
        </Toolbar>
      </AppBar>
      {activeTab === 0 ? <WizardPage /> : <SettingsPage />}
    </>
  );
}

export default App;
