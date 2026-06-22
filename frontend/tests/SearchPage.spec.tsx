import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchPage } from '../src/pages/SearchPage';
import { useAuth } from '../src/context/AuthContext';
import { RawgAPI, LibraryAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  RawgAPI: {
    searchGames: vi.fn(),
    getGameDetails: vi.fn(),
  },
  SocialAPI: {
    searchUsers: vi.fn(),
    likeReview: vi.fn(),
    unlikeReview: vi.fn(),
  },
  LibraryAPI: {
    getGameReviews: vi.fn(),
    getEntryByRawgId: vi.fn(),
    updateGame: vi.fn(),
    addGame: vi.fn(),
    deleteGame: vi.fn(),
  },
  CommentAPI: {
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

vi.mock('../src/components/PriceWidget', () => ({
  PriceWidget: () => null,
}));

(globalThis as any).IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const rawgResult = {
  id: 777,
  name: 'Hollow Knight',
  background_image: '',
  platforms: [],
  genres: [],
};

const renderSearchPage = () =>
  render(
    <BrowserRouter>
      <SearchPage />
    </BrowserRouter>
  );

describe('SearchPage — opening a game already in the library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'me', username: 'me', email: 'me@test.com' },
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
    vi.mocked(RawgAPI.searchGames).mockResolvedValue({ data: { results: [rawgResult], next: null } } as any);
    vi.mocked(RawgAPI.getGameDetails).mockResolvedValue({ data: {} } as any);
    vi.mocked(LibraryAPI.getGameReviews).mockResolvedValue({ data: { reviews: [] } } as any);
  });

  it('pre-fills the modal with the existing entry\'s rating, hours and status', async () => {
    vi.mocked(LibraryAPI.getEntryByRawgId).mockResolvedValue({
      data: { entry: { _id: 'entry-9', status: 'completed', rating: 8, hoursPlayed: 40 } },
    } as any);

    renderSearchPage();

    fireEvent.change(screen.getByPlaceholderText('Search by title, studio...'), { target: { value: 'Hollow Knight' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByText('Hollow Knight')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Hollow Knight'));

    await waitFor(() => {
      expect(LibraryAPI.getEntryByRawgId).toHaveBeenCalledWith(777);
    });

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
  });

  it('falls back to a fresh wishlist entry when the game is not in the library', async () => {
    vi.mocked(LibraryAPI.getEntryByRawgId).mockResolvedValue({ data: { entry: null } } as any);

    renderSearchPage();

    fireEvent.change(screen.getByPlaceholderText('Search by title, studio...'), { target: { value: 'Hollow Knight' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByText('Hollow Knight')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Hollow Knight'));

    await waitFor(() => {
      expect(screen.getByText('Add to Library')).toBeInTheDocument();
    });
  });
});
