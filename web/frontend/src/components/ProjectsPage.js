import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Card, CardContent, Box, Typography, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip
} from '@mui/material';
import api from '../api';

export default function ProjectsPage() {
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
