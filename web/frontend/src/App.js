import React, { useState, useEffect, useRef } from 'react';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import axios from 'axios';
import {
  CssBaseline, AppBar, Toolbar, Typography, Button,
  Container, Card, CardContent, Box, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip
} from '@mui/material';
import './users-box.css';

const Form = withTheme(MaterialUITheme);

const WIZARD_STEPS = ['governance', 'ingress', 'deployment'];
const API_URL = process.env.REACT_APP_API_URL || '/api';

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

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [prStatuses, setPrStatuses] = useState({});
  const [triggered, setTriggered] = useState({});
  const [loadError, setLoadError] = useState(null);
  const intervalRef = useRef(null);

  const pollStatuses = (projectList) => {
    projectList.forEach(project => {
      if (!project.pr_number) return;
      axios.get(`${API_URL}/projects/${project.name}/pr-status`)
        .then(res => setPrStatuses(prev => ({ ...prev, [project.name]: res.data })))
        .catch(err => console.warn(`PR status failed for ${project.name}:`, err.message));
    });
  };
  useEffect(() => {
    axios.get(`${API_URL}/projects`)
      .then(res => {
        const data = res.data || [];
        setProjects(data);
        if (data.length > 0) {
          pollStatuses(data);
          intervalRef.current = setInterval(() => pollStatuses(data), 10000);
        }
      })
      .catch(err => setLoadError(err.message));
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleTrigger = (name) => {
    axios.post(`${API_URL}/projects/${name}/trigger`)
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
