import { RESOURCE_TYPES } from '../defaults';

export const customUiSchema = {
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
