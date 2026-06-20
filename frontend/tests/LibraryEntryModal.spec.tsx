import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LibraryEntryModal } from '../src/components/LibraryEntryModal';
import { useAuth } from '../src/context/AuthContext';
import { LibraryAPI, RawgAPI, CommentAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  LibraryAPI: {
    getGameReviews: vi.fn(),
    updateGame: vi.fn(),
    addGame: vi.fn(),
    deleteGame: vi.fn(),
  },
  RawgAPI: {
    getGameDetails: vi.fn(),
  },
  SocialAPI: {
    likeReview: vi.fn(),
    unlikeReview: vi.fn(),
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

const baseGame = {
  _id: 'entry-1',
  rawgGameId: 123,
  title: 'Elden Ring',
  coverImage: '',
  status: 'completed',
  rating: 8,
  hoursPlayed: 40,
  reviewLogs: [],
};

const communityReview = {
  username: 'otherUser',
  text: 'Great game!',
  rating: 9,
  hoursPlayed: 50,
  createdAt: new Date().toISOString(),
  isCurrentUser: false,
  gameEntryId: 'entry-2',
  reviewLogId: 'log-1',
  likeCount: 0,
  isLikedByMe: false,
  commentCount: 2,
};

const renderModal = () =>
  render(
    <BrowserRouter>
      <LibraryEntryModal game={baseGame} onClose={vi.fn()} onUpdated={vi.fn()} />
    </BrowserRouter>
  );

describe('LibraryEntryModal — community comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'me', username: 'me', email: 'me@test.com' },
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
    vi.mocked(RawgAPI.getGameDetails).mockResolvedValue({ data: {} } as any);
    vi.mocked(LibraryAPI.getGameReviews).mockResolvedValue({ data: { reviews: [communityReview] } } as any);
  });

  it('renders the comment count from the review', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Great game!')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('fetches and shows comments when the comment button is clicked', async () => {
    vi.mocked(CommentAPI.getComments).mockResolvedValue({
      data: { comments: [{ _id: 'c1', commenterId: 'someoneElse', username: 'someoneElse', text: 'Nice review!' }] },
    } as any);

    renderModal();
    await waitFor(() => expect(screen.getByText('Great game!')).toBeInTheDocument());

    fireEvent.click(screen.getByText('2'));

    await waitFor(() => {
      expect(CommentAPI.getComments).toHaveBeenCalledWith('log-1');
      expect(screen.getByText('Nice review!')).toBeInTheDocument();
    });
  });

  it('adds a new comment to the list', async () => {
    vi.mocked(CommentAPI.getComments).mockResolvedValue({ data: { comments: [] } } as any);
    vi.mocked(CommentAPI.addComment).mockResolvedValue({
      data: { comment: { _id: 'c2', commenterId: 'me', username: 'me', text: 'My new comment' } },
    } as any);

    renderModal();
    await waitFor(() => expect(screen.getByText('Great game!')).toBeInTheDocument());

    fireEvent.click(screen.getByText('2'));
    await waitFor(() => expect(CommentAPI.getComments).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('Write a comment…');
    fireEvent.change(input, { target: { value: 'My new comment' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(CommentAPI.addComment).toHaveBeenCalledWith('entry-2', 'log-1', 'My new comment');
      expect(screen.getByText('My new comment')).toBeInTheDocument();
    });
  });

  it('only shows the delete button for the current user\'s own comments', async () => {
    vi.mocked(CommentAPI.getComments).mockResolvedValue({
      data: {
        comments: [
          { _id: 'c1', commenterId: 'me', username: 'me', text: 'Mine' },
          { _id: 'c2', commenterId: 'someoneElse', username: 'someoneElse', text: 'Theirs' },
        ],
      },
    } as any);

    renderModal();
    await waitFor(() => expect(screen.getByText('Great game!')).toBeInTheDocument());
    fireEvent.click(screen.getByText('2'));

    await waitFor(() => {
      expect(screen.getByText('Mine')).toBeInTheDocument();
      expect(screen.getByText('Theirs')).toBeInTheDocument();
    });

    const mineRow = screen.getByText('Mine').closest('div')?.parentElement;
    const theirsRow = screen.getByText('Theirs').closest('div')?.parentElement;
    expect(mineRow?.querySelector('button')).toBeTruthy();
    expect(theirsRow?.querySelector('button')).toBeFalsy();
  });

  it('removes a comment from the list after deleting it', async () => {
    vi.mocked(CommentAPI.getComments).mockResolvedValue({
      data: { comments: [{ _id: 'c1', commenterId: 'me', username: 'me', text: 'Delete me' }] },
    } as any);
    vi.mocked(CommentAPI.deleteComment).mockResolvedValue({ data: {} } as any);

    renderModal();
    await waitFor(() => expect(screen.getByText('Great game!')).toBeInTheDocument());
    fireEvent.click(screen.getByText('2'));

    await waitFor(() => expect(screen.getByText('Delete me')).toBeInTheDocument());

    const deleteButton = screen.getByText('Delete me').parentElement?.parentElement?.querySelector('button');
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(CommentAPI.deleteComment).toHaveBeenCalledWith('c1');
      expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    });
  });
});
