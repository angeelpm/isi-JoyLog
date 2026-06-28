import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DiaryPage } from '../src/pages/DiaryPage';
import { LibraryAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/services/api', () => ({
  LibraryAPI: { getGames: vi.fn() },
}));

const renderDiary = () =>
  render(
    <BrowserRouter>
      <DiaryPage />
    </BrowserRouter>
  );

describe('DiaryPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flattens and orders reviewLogs from multiple entries by date desc', async () => {
    vi.mocked(LibraryAPI.getGames).mockResolvedValue({
      data: {
        entries: [
          {
            _id: 'g1',
            title: 'Hollow Knight',
            rawgGameId: 1,
            reviewLogs: [
              { _id: 'l1', text: 'First impressions', rating: 7, createdAt: '2026-01-01T00:00:00.000Z' },
            ],
          },
          {
            _id: 'g2',
            title: 'Celeste',
            rawgGameId: 2,
            reviewLogs: [
              { _id: 'l2', text: 'Finished it', rating: 9, createdAt: '2026-02-01T00:00:00.000Z' },
              { _id: 'l3', text: 'Halfway', rating: 8, createdAt: '2026-01-15T00:00:00.000Z' },
            ],
          },
        ],
      },
    } as any);

    renderDiary();

    await waitFor(() => expect(screen.getByText('Finished it')).toBeInTheDocument());

    const texts = screen.getAllByText(/First impressions|Finished it|Halfway/);
    expect(texts.map(el => el.textContent)).toEqual(['Finished it', 'Halfway', 'First impressions']);
  });

  it('shows empty state when there are no reviewLogs', async () => {
    vi.mocked(LibraryAPI.getGames).mockResolvedValue({
      data: { entries: [{ _id: 'g1', title: 'No reviews', rawgGameId: 1, reviewLogs: [] }] },
    } as any);

    renderDiary();

    await waitFor(() => {
      expect(screen.getByText(/Todavía no has escrito ninguna reseña/i)).toBeInTheDocument();
    });
  });
});
