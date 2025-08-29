# OpenShift Console Plugin for Secrets Management

This project is a minimal OpenShift Console Plugin for managing resources
associated with secrets management. This includes the CRDs for:
- cert-manager
- external secrets operator
- secrets store csi (TODO)

This project is based off of the OpenShift dynamic console plugin template seen [here](https://github.com/openshift/console-plugin-template)

[Dynamic plugins](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
allow you to extend the
[OpenShift UI](https://github.com/openshift/console)
at runtime, adding custom pages and other extensions. They are based on
[webpack module federation](https://webpack.js.org/concepts/module-federation/).
Plugins are registered with console using the `ConsolePlugin` custom resource
and enabled in the console operator config by a cluster administrator.

Using the latest `v1` API version of `ConsolePlugin` CRD, requires OpenShift 4.12
and higher. For using old `v1alpha1` API version us OpenShift version 4.10 or 4.11.

For an example of a plugin that works with OpenShift 4.11, see the `release-4.11` branch.
For a plugin that works with OpenShift 4.10, see the `release-4.10` branch.

[Node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com) are required
to build and run the example. To run OpenShift console in a container, either
[Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io) and
[oc](https://console.redhat.com/openshift/downloads) are required.

## Development

Note: This plugin was primarily generated using cursor and AI prompts.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/en/)
- **Yarn** package manager - [Installation guide](https://yarnpkg.com/getting-started/install)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **OpenShift CLI (oc)** - [Download here](https://console.redhat.com/openshift/downloads)
- **Git** - For cloning the repository

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ocp-secrets-management
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start Docker Desktop**
   - Make sure Docker Desktop is running on your system
   - You should see the Docker icon in your system tray/menu bar

4. **Login to your OpenShift cluster**
   ```bash
   oc login <your-openshift-cluster-url>
   ```

5. **Start the plugin development server**
   ```bash
   yarn start
   ```
   This will start the webpack development server on `http://localhost:9001`

6. **In a new terminal, start the OpenShift Console**
   ```bash
   yarn start-console
   ```
   This will start the OpenShift Console on `http://localhost:9000`

7. **Access the plugin**
   - Open your browser and navigate to `http://localhost:9000`
   - Login with your OpenShift credentials
   - Look for "Secrets Management" in the navigation menu

### Available Scripts

- `yarn start` - Start the plugin development server
- `yarn start-console` - Start the OpenShift Console with plugin integration
- `yarn build` - Build the plugin for production
- `yarn build-dev` - Build the plugin for development
- `yarn lint` - Run ESLint for code quality checks
- `yarn test` - Run Jest tests

### Plugin Features

This plugin provides a comprehensive interface for managing secrets-related Kubernetes resources:

#### **Resource Management**
- **Certificates** (cert-manager.io/v1)
- **Issuers & ClusterIssuers** (cert-manager.io/v1)
- **ExternalSecrets** (external-secrets.io/v1beta1)
- **SecretStores & ClusterSecretStores** (external-secrets.io/v1beta1)

#### **Key Capabilities**
- **Resource Filtering** - Filter by operator (cert-manager, external-secrets) and resource kind
- **Resource Inspection** - View detailed metadata, labels, annotations, specifications, and status
- **Resource Deletion** - Delete resources with confirmation dialogs
- **Sensitive Data Toggle** - Show/hide sensitive information in resource details
- **Real-time Updates** - Live resource monitoring with Kubernetes watch API

### Troubleshooting

#### Port Already in Use
If you encounter "EADDRINUSE" errors:
```bash
# Kill existing Node.js processes
killall -9 node

# Restart the services
yarn start
# In new terminal:
yarn start-console
```

#### Docker Issues
If the console fails to start:
- Ensure Docker Desktop is running
- Try restarting Docker Desktop
- Check if port 9000 is available

#### Plugin Not Loading
If the plugin doesn't appear in the console:
- Verify both `yarn start` and `yarn start-console` are running
- Check the browser console for errors
- Ensure you're logged into the correct OpenShift cluster

#### Resource Access Issues
If resources don't load:
- Verify your OpenShift user has appropriate RBAC permissions
- Check that cert-manager and external-secrets-operator are installed in your cluster
- Ensure the "demo" namespace exists (or modify the code to use your desired namespace)

### Development Notes

- The plugin uses the OpenShift Console Dynamic Plugin SDK
- Hot reloading is enabled for development efficiency
- All console debugging has been removed for production readiness
- CSRF tokens are handled automatically for API requests
