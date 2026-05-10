import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { useAuth } from '../src/context/AuthContext';
import { vi, describe, it, expect } from 'vitest';

// Mock useAuth
vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('ProtectedRoute Component', () => {
  it('shows loading when authentication is loading', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: { id: '1', username: 'testuser' },
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
    expect(screen.queryByText(/Login Page/i)).not.toBeInTheDocument();
  });
});
