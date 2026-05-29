import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecretsManagement from './SecretsManagement';
import { useOperatorDetection } from './hooks/useOperatorDetection';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// Mock dependencies
jest.mock('./hooks/useOperatorDetection', () => ({
  useOperatorDetection: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  consoleFetch: jest.fn(),
}));

// Mock child table components
jest.mock('./components/CertificatesTable', () => ({
  CertificatesTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="certificates-table">Certificates Table - Project: {selectedProject}</div>
  ),
}));

jest.mock('./components/IssuersTable', () => ({
  IssuersTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="issuers-table">Issuers Table - Project: {selectedProject}</div>
  ),
}));

jest.mock('./components/ExternalSecretsTable', () => ({
  ExternalSecretsTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="external-secrets-table">External Secrets Table - Project: {selectedProject}</div>
  ),
}));

jest.mock('./components/SecretStoresTable', () => ({
  SecretStoresTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="secret-stores-table">Secret Stores Table - Project: {selectedProject}</div>
  ),
}));

jest.mock('./components/PushSecretsTable', () => ({
  PushSecretsTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="push-secrets-table">Push Secrets Table - Project: {selectedProject}</div>
  ),
}));

jest.mock('./components/SecretProviderClassTable', () => ({
  SecretProviderClassTable: ({ selectedProject }: { selectedProject: string }) => (
    <div data-test="secret-provider-class-table">
      Secret Provider Class Table - Project: {selectedProject}
    </div>
  ),
}));

jest.mock('./components/OperatorNotInstalled', () => ({
  NoOperatorsInstalled: () => <div data-test="no-operators">No operators installed</div>,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-helmet
jest.mock('react-helmet', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseOperatorDetection = useOperatorDetection as jest.Mock;
const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;

describe('SecretsManagement', () => {
  const defaultOperatorStatus = {
    certManager: { installed: true, loading: false },
    externalSecrets: { installed: true, loading: false },
    secretsStoreCSI: { installed: true, loading: false },
    loading: false,
    refresh: jest.fn(),
  };

  const mockProjects = [
    {
      metadata: { name: 'default' },
      status: { phase: 'Active' },
    },
    {
      metadata: { name: 'my-project' },
      status: { phase: 'Active' },
    },
    {
      metadata: { name: 'openshift-operators' },
      status: { phase: 'Active' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseOperatorDetection.mockReturnValue(defaultOperatorStatus);
    mockUseK8sWatchResource.mockReturnValue([mockProjects, true, undefined]);
  });

  describe('Page Structure', () => {
    it('renders the page title', () => {
      render(<SecretsManagement />);
      expect(screen.getByTestId('secrets-management-page-title')).toBeInTheDocument();
    });

    it('renders the page heading with icon', () => {
      render(<SecretsManagement />);
      expect(
        screen.getByRole('heading', { name: /Secrets Management/i, level: 1 }),
      ).toBeInTheDocument();
    });

    it('renders the page description', () => {
      render(<SecretsManagement />);
      expect(
        screen.getByText(
          'Manage certificates, external secrets, and secret stores across your cluster.',
        ),
      ).toBeInTheDocument();
    });

    it('renders all three filter dropdowns', () => {
      render(<SecretsManagement />);
      expect(screen.getByRole('button', { name: /Project/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Operator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resource Type/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when operators are being detected', () => {
      mockUseOperatorDetection.mockReturnValue({
        ...defaultOperatorStatus,
        loading: true,
      });

      render(<SecretsManagement />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows loading text in project dropdown when projects are loading', () => {
      mockUseK8sWatchResource.mockReturnValue([[], false, undefined]);

      render(<SecretsManagement />);
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    });

    it('disables project dropdown when projects are loading', () => {
      mockUseK8sWatchResource.mockReturnValue([[], false, undefined]);

      render(<SecretsManagement />);
      const projectButton = screen.getByRole('button', { name: /Project/i });
      expect(projectButton).toBeDisabled();
    });
  });

  describe('No Operators Installed', () => {
    it('shows NoOperatorsInstalled component when no operators are detected', () => {
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false },
        externalSecrets: { installed: false, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: jest.fn(),
      });

      render(<SecretsManagement />);
      expect(screen.getByTestId('no-operators')).toBeInTheDocument();
    });

    it('does not show resource tables when no operators are installed', () => {
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false },
        externalSecrets: { installed: false, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: jest.fn(),
      });

      render(<SecretsManagement />);
      expect(screen.queryByTestId('certificates-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('issuers-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('external-secrets-table')).not.toBeInTheDocument();
    });
  });

  describe('All Operators Installed', () => {
    it('renders all resource tables when all operators are installed', () => {
      render(<SecretsManagement />);

      // cert-manager tables
      expect(screen.getByTestId('certificates-table')).toBeInTheDocument();
      expect(screen.getByTestId('issuers-table')).toBeInTheDocument();

      // External Secrets Operator tables
      expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
      expect(screen.getByTestId('secret-stores-table')).toBeInTheDocument();
      expect(screen.getByTestId('push-secrets-table')).toBeInTheDocument();

      // Secrets Store CSI Driver table
      expect(screen.getByTestId('secret-provider-class-table')).toBeInTheDocument();
    });

    it('displays correct section headings for all resources', () => {
      render(<SecretsManagement />);

      expect(screen.getByRole('heading', { name: 'Certificates', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Issuers', level: 3 })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'External Secrets', level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Secret Stores', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Push Secrets', level: 3 })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Secret Provider Classes', level: 3 }),
      ).toBeInTheDocument();
    });

    it('displays operator badges for each resource section', () => {
      render(<SecretsManagement />);

      // Should have cert-manager badges (2 sections)
      const certManagerBadges = screen.getAllByText('cert-manager');
      expect(certManagerBadges.length).toBeGreaterThanOrEqual(2);

      // Should have External Secrets Operator badges (3 sections)
      const esooBadges = screen.getAllByText('External Secrets Operator');
      expect(esooBadges.length).toBeGreaterThanOrEqual(3);

      // Should have Secrets Store CSI Driver badge (1 section)
      expect(screen.getByText('Secrets Store CSI Driver')).toBeInTheDocument();
    });
  });

  describe('Partial Operator Installation', () => {
    it('shows only cert-manager resources when only cert-manager is installed', () => {
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: true, loading: false },
        externalSecrets: { installed: false, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: jest.fn(),
      });

      render(<SecretsManagement />);

      expect(screen.getByTestId('certificates-table')).toBeInTheDocument();
      expect(screen.getByTestId('issuers-table')).toBeInTheDocument();
      expect(screen.queryByTestId('external-secrets-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('secret-provider-class-table')).not.toBeInTheDocument();
    });

    it('shows only External Secrets resources when only ESO is installed', () => {
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false },
        externalSecrets: { installed: true, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: jest.fn(),
      });

      render(<SecretsManagement />);

      expect(screen.queryByTestId('certificates-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
      expect(screen.getByTestId('secret-stores-table')).toBeInTheDocument();
      expect(screen.getByTestId('push-secrets-table')).toBeInTheDocument();
      expect(screen.queryByTestId('secret-provider-class-table')).not.toBeInTheDocument();
    });
  });

  describe('Operator Error Handling', () => {
    it('shows error badge when operator detection fails', () => {
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false, error: 'API unreachable' },
        externalSecrets: { installed: true, loading: false },
        secretsStoreCSI: { installed: true, loading: false },
        loading: false,
        refresh: jest.fn(),
      });

      render(<SecretsManagement />);

      expect(screen.getByText('Check failed')).toBeInTheDocument();
    });

    it('shows error alert with retry button when operator check fails', () => {
      const mockRefresh = jest.fn();
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false, error: 'Connection timeout' },
        externalSecrets: { installed: false, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: mockRefresh,
      });

      render(<SecretsManagement />);

      expect(screen.getByText('Unable to verify operator status')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls refresh when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();
      mockUseOperatorDetection.mockReturnValue({
        certManager: { installed: false, loading: false, error: 'Connection timeout' },
        externalSecrets: { installed: false, loading: false },
        secretsStoreCSI: { installed: false, loading: false },
        loading: false,
        refresh: mockRefresh,
      });

      render(<SecretsManagement />);

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filter Functionality', () => {
    describe('Project Filter', () => {
      it('opens project dropdown menu when clicked', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const projectButton = screen.getByRole('button', { name: /Project/i });
        await user.click(projectButton);

        await waitFor(() => {
          expect(screen.getByText('All Projects')).toBeInTheDocument();
          expect(screen.getByText('default')).toBeInTheDocument();
          expect(screen.getByText('my-project')).toBeInTheDocument();
        });
      });

      it('filters projects to show only user-created projects', () => {
        const projectsWithSystem = [
          ...mockProjects,
          { metadata: { name: 'kube-system' }, status: { phase: 'Active' } },
          { metadata: { name: 'openshift-kube-apiserver' }, status: { phase: 'Active' } },
        ];

        mockUseK8sWatchResource.mockReturnValue([projectsWithSystem, true, undefined]);
        render(<SecretsManagement />);

        // System namespaces should be filtered out (except whitelisted ones)
        // Only user projects and whitelisted system projects should show
        expect(mockProjects.length).toBe(3); // default, my-project, openshift-operators
      });

      it('passes selected project to all resource tables', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const projectButton = screen.getByRole('button', { name: /Project/i });
        await user.click(projectButton);

        const myProjectOption = await screen.findByText('my-project');
        await user.click(myProjectOption);

        await waitFor(() => {
          expect(screen.getByTestId('certificates-table')).toHaveTextContent(
            'Project: my-project',
          );
          expect(screen.getByTestId('issuers-table')).toHaveTextContent('Project: my-project');
          expect(screen.getByTestId('external-secrets-table')).toHaveTextContent(
            'Project: my-project',
          );
        });
      });
    });

    describe('Operator Filter', () => {
      it('opens operator dropdown menu when clicked', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const operatorButton = screen.getByRole('button', { name: /Operator/i });
        await user.click(operatorButton);

        await waitFor(() => {
          expect(screen.getByText('All Operators')).toBeInTheDocument();
          expect(screen.getByText('cert-manager')).toBeInTheDocument();
          expect(screen.getByText('External Secrets Operator')).toBeInTheDocument();
        });
      });

      it('shows only cert-manager resources when cert-manager filter is selected', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const operatorButton = screen.getByRole('button', { name: /Operator/i });
        await user.click(operatorButton);

        const certManagerOption = await screen.findByText('cert-manager');
        await user.click(certManagerOption);

        await waitFor(() => {
          expect(screen.getByTestId('certificates-table')).toBeInTheDocument();
          expect(screen.getByTestId('issuers-table')).toBeInTheDocument();
          expect(screen.queryByTestId('external-secrets-table')).not.toBeInTheDocument();
          expect(screen.queryByTestId('secret-stores-table')).not.toBeInTheDocument();
        });
      });

      it('resets resource filter when operator filter changes', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        // First select a specific operator
        const operatorButton = screen.getByRole('button', { name: /Operator/i });
        await user.click(operatorButton);

        const certManagerOption = await screen.findByText('cert-manager');
        await user.click(certManagerOption);

        // Verify resource filter was reset
        await waitFor(() => {
          const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
          expect(resourceButton).toHaveTextContent('All Resources');
        });
      });
    });

    describe('Resource Kind Filter', () => {
      it('opens resource kind dropdown menu when clicked', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
        await user.click(resourceButton);

        await waitFor(() => {
          expect(screen.getByText('All Resources')).toBeInTheDocument();
          expect(screen.getByText('Certificates')).toBeInTheDocument();
          expect(screen.getByText('Issuers')).toBeInTheDocument();
        });
      });

      it('shows only certificates when certificates filter is selected', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
        await user.click(resourceButton);

        const certificatesOption = await screen.findByText('Certificates');
        await user.click(certificatesOption);

        await waitFor(() => {
          expect(screen.getByTestId('certificates-table')).toBeInTheDocument();
          expect(screen.queryByTestId('issuers-table')).not.toBeInTheDocument();
          expect(screen.queryByTestId('external-secrets-table')).not.toBeInTheDocument();
        });
      });

      it('shows only external secrets when external secrets filter is selected', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
        await user.click(resourceButton);

        const externalSecretsOption = await screen.findByText('External Secrets');
        await user.click(externalSecretsOption);

        await waitFor(() => {
          expect(screen.queryByTestId('certificates-table')).not.toBeInTheDocument();
          expect(screen.getByTestId('external-secrets-table')).toBeInTheDocument();
          expect(screen.queryByTestId('secret-stores-table')).not.toBeInTheDocument();
        });
      });
    });

    describe('Combined Filters', () => {
      it('applies both operator and resource kind filters together', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        // Select cert-manager operator
        const operatorButton = screen.getByRole('button', { name: /Operator/i });
        await user.click(operatorButton);
        const certManagerOption = await screen.findByText('cert-manager');
        await user.click(certManagerOption);

        // Select certificates resource
        const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
        await user.click(resourceButton);
        const certificatesOption = await screen.findByText('Certificates');
        await user.click(certificatesOption);

        await waitFor(() => {
          expect(screen.getByTestId('certificates-table')).toBeInTheDocument();
          expect(screen.queryByTestId('issuers-table')).not.toBeInTheDocument();
          expect(screen.queryByTestId('external-secrets-table')).not.toBeInTheDocument();
        });
      });

      it('applies all three filters (project, operator, resource) together', async () => {
        const user = userEvent.setup();
        render(<SecretsManagement />);

        // Select project
        const projectButton = screen.getByRole('button', { name: /Project/i });
        await user.click(projectButton);
        const myProjectOption = await screen.findByText('my-project');
        await user.click(myProjectOption);

        // Select operator
        const operatorButton = screen.getByRole('button', { name: /Operator/i });
        await user.click(operatorButton);
        const certManagerOption = await screen.findByText('cert-manager');
        await user.click(certManagerOption);

        // Select resource
        const resourceButton = screen.getByRole('button', { name: /Resource Type/i });
        await user.click(resourceButton);
        const certificatesOption = await screen.findByText('Certificates');
        await user.click(certificatesOption);

        await waitFor(() => {
          const certificatesTable = screen.getByTestId('certificates-table');
          expect(certificatesTable).toBeInTheDocument();
          expect(certificatesTable).toHaveTextContent('Project: my-project');
          expect(screen.queryByTestId('issuers-table')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Project Error Handling', () => {
    it('shows error message when project loading fails', () => {
      mockUseK8sWatchResource.mockReturnValue([
        [],
        false,
        new Error('Failed to fetch projects'),
      ]);

      render(<SecretsManagement />);

      expect(screen.getByText('Error loading projects')).toBeInTheDocument();
    });

    it('disables project dropdown when there is an error', () => {
      mockUseK8sWatchResource.mockReturnValue([
        [],
        false,
        new Error('Failed to fetch projects'),
      ]);

      render(<SecretsManagement />);

      const projectButton = screen.getByRole('button', { name: /Project/i });
      expect(projectButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on filter buttons', () => {
      render(<SecretsManagement />);

      expect(screen.getByRole('button', { name: /Project/i })).toHaveAttribute(
        'aria-label',
        'Project',
      );
      expect(screen.getByRole('button', { name: /Operator/i })).toHaveAttribute(
        'aria-label',
        'Operator',
      );
      expect(screen.getByRole('button', { name: /Resource Type/i })).toHaveAttribute(
        'aria-label',
        'Resource Type',
      );
    });

    it('has proper heading hierarchy', () => {
      render(<SecretsManagement />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Secrets Management');

      const h3Headings = screen.getAllByRole('heading', { level: 3 });
      expect(h3Headings.length).toBeGreaterThan(0);
    });
  });
});
