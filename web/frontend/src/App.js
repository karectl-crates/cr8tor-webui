import React, { useState } from 'react';
import {
  CssBaseline, AppBar, Toolbar, Typography, Tabs, Tab
} from '@mui/material';
import WizardPage from './components/WizardPage';
import SettingsPage from './components/SettingsPage';
import ProjectsPage from './components/ProjectsPage';

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
