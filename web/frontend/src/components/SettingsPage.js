import React, { useState, useEffect } from 'react';
import {
  Container, Card, CardContent, Box, Typography, Button
} from '@mui/material';
import api from '../api';

export default function SettingsPage() {
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
