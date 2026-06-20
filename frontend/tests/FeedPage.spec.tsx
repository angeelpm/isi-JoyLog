import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FeedPage } from '../src/pages/FeedPage';
import { useAuth } from '../src/context/AuthContext';
import { SocialAPI, FeedAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  SocialAPI: { getFollowing: vi.fn() },
  FeedAPI: { getFeed: vi.fn() },
}));

const renderFeed = () =>
  render(
    <BrowserRouter>
      <FeedPage />
    </BrowserRouter>
  );

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'me', email: 'me@test.com' },
      token: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('shows empty state when not following anyone', async () => {
    vi.mocked(SocialAPI.getFollowing).mockResolvedValue({ data: [] } as any);

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText(/Todavía no sigues a nadie/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Buscar usuarios/i)).toBeInTheDocument();
    expect(FeedAPI.getFeed).not.toHaveBeenCalled();
  });

  it('renders review and completed items with correct text', async () => {
    vi.mocked(SocialAPI.getFollowing).mockResolvedValue({
      data: [{ _id: 'u2', username: 'friend' }],
    } as any);
    vi.mocked(FeedAPI.getFeed).mockResolvedValue({
      data: {
        items: [
          {
            username: 'friend',
            rawgGameId: 1,
            title: 'Hollow Knight',
            type: 'review',
            text: 'Great game',
            rating: 9,
            createdAt: '2026-01-01T00:00:00.000Z',
            gameEntryId: 'g1',
            reviewLogId: 'r1',
          },
          {
            username: 'friend',
            rawgGameId: 2,
            title: 'Celeste',
            type: 'completed',
            createdAt: '2026-01-02T00:00:00.000Z',
            gameEntryId: 'g2',
          },
        ],
        page: 1,
        hasMore: false,
      },
    } as any);

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText(/Hollow Knight/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/reseñó/i)).toBeInTheDocument();
    expect(screen.getByText(/Great game/i)).toBeInTheDocument();
    expect(screen.getByText(/completó/i)).toBeInTheDocument();
    expect(screen.getByText(/Celeste/i)).toBeInTheDocument();
  });

  it('"Cargar más" calls getFeed with incremented page and concatenates results', async () => {
    vi.mocked(SocialAPI.getFollowing).mockResolvedValue({
      data: [{ _id: 'u2', username: 'friend' }],
    } as any);
    vi.mocked(FeedAPI.getFeed)
      .mockResolvedValueOnce({
        data: {
          items: [
            { username: 'friend', rawgGameId: 1, title: 'Game One', type: 'completed', createdAt: '2026-01-01T00:00:00.000Z', gameEntryId: 'g1' },
          ],
          page: 1,
          hasMore: true,
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          items: [
            { username: 'friend', rawgGameId: 2, title: 'Game Two', type: 'completed', createdAt: '2026-01-02T00:00:00.000Z', gameEntryId: 'g2' },
          ],
          page: 2,
          hasMore: false,
        },
      } as any);

    renderFeed();

    await waitFor(() => expect(screen.getByText(/Game One/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Cargar más/i));

    await waitFor(() => expect(screen.getByText(/Game Two/i)).toBeInTheDocument());
    expect(screen.getByText(/Game One/i)).toBeInTheDocument();
    expect(FeedAPI.getFeed).toHaveBeenLastCalledWith(['u2'], 2);
  });

  it('does not break if following comes back empty/undefined from SocialAPI', async () => {
    vi.mocked(SocialAPI.getFollowing).mockResolvedValue({ data: undefined } as any);

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText(/Todavía no sigues a nadie/i)).toBeInTheDocument();
    });
  });
});
