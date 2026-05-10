import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from '../src/components/Navbar';
import { useAuth } from '../src/context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useAuth hook
vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('Navbar Component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login and signup links when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      logout: mockLogout
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });

  it('renders nav links and user menu when user is authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: { id: '1', username: 'testuser', email: 'test@example.com' },
      logout: mockLogout
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Library/i)).toBeInTheDocument();
    expect(screen.getByText(/Search/i)).toBeInTheDocument();
    expect(screen.getByText(/testuser/i)).toBeInTheDocument();
  });

  it('calls logout and navigates when logout button is clicked', () => {
    (useAuth as any).mockReturnValue({
      user: { id: '1', username: 'testuser', email: 'test@example.com' },
      logout: mockLogout
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const logoutBtn = screen.getByTitle(/Logout/i);
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
