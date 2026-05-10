import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/LoginPage';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../src/services/api', () => ({
  api: {
    post: vi.fn()
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      login: mockLogin
    });
  });

  it('renders the login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Username or Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('submits the form and calls login on success', async () => {
    (api.post as any).mockResolvedValue({
      data: { token: 'fake-token', user: { id: '1', username: 'testuser' } }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Username or Email/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        usernameOrEmail: 'testuser',
        password: 'password123'
      });
      expect(mockLogin).toHaveBeenCalledWith('fake-token', { id: '1', username: 'testuser' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failure', async () => {
    (api.post as any).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Invalid credentials' } }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Username or Email/i), { target: { value: 'wrong@user.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
