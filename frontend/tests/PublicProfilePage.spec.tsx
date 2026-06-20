import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicProfilePage } from '../src/pages/PublicProfilePage';
import { useAuth } from '../src/context/AuthContext';
import { SocialAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  SocialAPI: {
    getPublicProfile: vi.fn(),
    getPublicStats: vi.fn(),
    getCommonGames: vi.fn(),
  },
}));

const renderProfile = (username = 'friend') =>
  render(
    <MemoryRouter initialEntries={[`/u/${username}`]}>
      <Routes>
        <Route path="/u/:username" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>
  );

const baseProfile = {
  _id: 'u2',
  username: 'friend',
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
};

describe('PublicProfilePage favorites & common games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SocialAPI.getPublicStats).mockResolvedValue({ data: { stats: { total: 0, completed: 0, totalHoursPlayed: 0, avgRating: 0 } } } as any);
  });

  it('renders favoriteGames in read-only mode', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', username: 'me', email: 'me@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(SocialAPI.getPublicProfile).mockResolvedValue({
      data: { ...baseProfile, favoriteGames: [{ rawgGameId: 5, title: 'Hades', coverImage: 'hades.jpg' }] },
    } as any);
    vi.mocked(SocialAPI.getCommonGames).mockResolvedValue({ data: { commonGames: [] } } as any);

    renderProfile();

    await waitFor(() => expect(screen.getByText('Hades')).toBeInTheDocument());
    expect(screen.queryByTitle(/Quitar de favoritos/i)).not.toBeInTheDocument();
  });

  it('shows common games grid when there are matches', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', username: 'me', email: 'me@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(SocialAPI.getPublicProfile).mockResolvedValue({ data: baseProfile } as any);
    vi.mocked(SocialAPI.getCommonGames).mockResolvedValue({
      data: { commonGames: [{ rawgGameId: 9, title: 'Elden Ring', coverImage: 'er.jpg' }] },
    } as any);

    renderProfile();

    await waitFor(() => expect(screen.getByText('Elden Ring')).toBeInTheDocument());
  });

  it('shows empty message when there are no common games', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', username: 'me', email: 'me@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(SocialAPI.getPublicProfile).mockResolvedValue({ data: baseProfile } as any);
    vi.mocked(SocialAPI.getCommonGames).mockResolvedValue({ data: { commonGames: [] } } as any);

    renderProfile();

    await waitFor(() => expect(screen.getByText(/No tenéis juegos en común todavía/i)).toBeInTheDocument());
  });

  it('does not show the common games section on your own profile', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u2', username: 'friend', email: 'friend@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(SocialAPI.getPublicProfile).mockResolvedValue({ data: baseProfile } as any);

    renderProfile();

    await waitFor(() => expect(screen.getByText('friend')).toBeInTheDocument());
    expect(screen.queryByText(/Juegos en común/i)).not.toBeInTheDocument();
    expect(SocialAPI.getCommonGames).not.toHaveBeenCalled();
  });
});
