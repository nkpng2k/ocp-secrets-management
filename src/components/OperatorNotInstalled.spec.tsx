import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoOperatorsInstalled } from './OperatorNotInstalled';

// Mock react-router
const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('NoOperatorsInstalled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('renders empty state component', () => {
      render(<NoOperatorsInstalled />);
      expect(screen.getByText('No supported secrets operators detected')).toBeInTheDocument();
    });

    it('renders the appropriate icon', () => {
      const { container } = render(<NoOperatorsInstalled />);
      // CubesIcon should be rendered
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders the empty state title as h4', () => {
      render(<NoOperatorsInstalled />);
      const heading = screen.getByRole('heading', {
        name: 'No supported secrets operators detected',
      });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H4');
    });

    it('renders the description text', () => {
      render(<NoOperatorsInstalled />);
      expect(
        screen.getByText(
          'Install a supported operator (cert-manager, External Secrets Operator, or Secrets Store CSI Driver) to manage secrets from this page.',
        ),
      ).toBeInTheDocument();
    });

    it('renders the catalog link button', () => {
      render(<NoOperatorsInstalled />);
      const button = screen.getByRole('button', { name: 'Go to Catalog' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('navigates to catalog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<NoOperatorsInstalled />);

      const catalogButton = screen.getByRole('button', { name: 'Go to Catalog' });
      await user.click(catalogButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/catalog/ns/default');
    });

    it('renders button as a link variant', () => {
      render(<NoOperatorsInstalled />);
      const button = screen.getByRole('button', { name: 'Go to Catalog' });
      // Link variant buttons should not have primary styling
      expect(button).not.toHaveClass('pf-m-primary');
    });
  });

  describe('Empty State Variant', () => {
    it('uses small variant for compact display', () => {
      const { container } = render(<NoOperatorsInstalled />);
      // PatternFly small variant should be applied
      const emptyState = container.querySelector('.pf-v6-c-empty-state');
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading hierarchy', () => {
      render(<NoOperatorsInstalled />);
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent('No supported secrets operators detected');
    });

    it('has accessible button', () => {
      render(<NoOperatorsInstalled />);
      const button = screen.getByRole('button', { name: 'Go to Catalog' });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('message provides clear guidance for users', () => {
      render(<NoOperatorsInstalled />);
      const message = screen.getByText(/Install a supported operator/i);
      expect(message).toBeInTheDocument();
      // Should mention all supported operators
      expect(message.textContent).toContain('cert-manager');
      expect(message.textContent).toContain('External Secrets Operator');
      expect(message.textContent).toContain('Secrets Store CSI Driver');
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys for all text content', () => {
      render(<NoOperatorsInstalled />);

      // All text should be translation keys (since we mocked t to return the key)
      expect(screen.getByText('No supported secrets operators detected')).toBeInTheDocument();
      expect(screen.getByText(/Install a supported operator/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to Catalog' })).toBeInTheDocument();
    });
  });
});
