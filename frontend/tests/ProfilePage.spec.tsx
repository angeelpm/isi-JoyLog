import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProfilePage } from '../src/pages/ProfilePage';
import { useAuth } from '../src/context/AuthContext';
import { AuthAPI, RawgAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  AuthAPI: { updateProfile: vi.fn() },
  RawgAPI: { searchGames: vi.fn() },
}));

const renderProfile = () =>
  render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );

describe('ProfilePage favorites', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adding a favorite calls updateProfile with the new array and updates the UI', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'me', email: 'me@test.com', favoriteGames: [] },
      token: 't',
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });
    vi.mocked(RawgAPI.searchGames).mockResolvedValue({
      data: { results: [{ id: 5, name: 'Hades', background_image: 'hades.jpg' }] },
    } as any);
    vi.mocked(AuthAPI.updateProfile).mockResolvedValue({
      data: { user: { id: 'u1', username: 'me', email: 'me@test.com', favoriteGames: [{ rawgGameId: 5, title: 'Hades', coverImage: 'hades.jpg' }] } },
    } as any);

    renderProfile();

    fireEvent.change(screen.getByPlaceholderText(/Buscar un juego para añadir a favoritos/i), { target: { value: 'Hades' } });
    fireEvent.submit(screen.getByPlaceholderText(/Buscar un juego para añadir a favoritos/i).closest('form')!);

    await waitFor(() => expect(screen.getByText('Hades')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Hades'));

    await waitFor(() => {
      expect(AuthAPI.updateProfile).toHaveBeenCalledWith({
        favoriteGames: [{ rawgGameId: 5, title: 'Hades', coverImage: 'hades.jpg' }],
      });
    });
  });

  it('removing a favorite calls updateProfile with the filtered array and removes it from the UI', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'u1', username: 'me', email: 'me@test.com',
        favoriteGames: [{ rawgGameId: 5, title: 'Hades', coverImage: 'hades.jpg' }],
      },
      token: 't',
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });
    vi.mocked(AuthAPI.updateProfile).mockResolvedValue({
      data: { user: { id: 'u1', username: 'me', email: 'me@test.com', favoriteGames: [] } },
    } as any);

    renderProfile();

    expect(screen.getByText('Hades')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Quitar de favoritos/i));

    await waitFor(() => {
      expect(AuthAPI.updateProfile).toHaveBeenCalledWith({ favoriteGames: [] });
    });
    expect(screen.queryByText('Hades')).not.toBeInTheDocument();
  });
});
