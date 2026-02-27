export const RESOURCE_TYPES = ['Resource', 'Jupyter', 'Keycloak', 'VDI', 'RStudio', 'Gitea'];

export const DEFAULT_DEPLOYMENT = {
  environment: { name: 'dev-tre' },
  resources: [
    {
      resource_type: 'Jupyter',
      name: 'jupyterhub',
      url: 'https://jupyter.example.org',
      enabled: true,
      auth: 'oidc',
      storage: {
        default_notebook_size: '5Gi',
        persist: false
      }
    },
    {
      resource_type: 'VDI',
      name: 'guacamole',
      enabled: true,
      scheduling: {
        resources: {
          requests_cpu: '500m',
          requests_memory: '1Gi',
          limits_cpu: '2',
          limits_memory: '4Gi'
        }
      },
      storage: {
        default_vdi_size: '5Gi',
        persist: false
      }
    },
    {
      resource_type: 'RStudio',
      name: 'rstudio',
      url: 'https://rstudio.example.org',
      enabled: false
    },
    {
      resource_type: 'Gitea',
      name: 'gitea',
      url: 'https://gitea.example.org',
      enabled: false
    }
  ]
};
