import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ListsPage } from '../src/pages/ListsPage';
import { useAuth } from '../src/context/AuthContext';
import { ListAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  ListAPI: { create: vi.fn(), getMine: vi.fn(), remove: vi.fn() },
}));

const renderLists = () =>
  render(
    <BrowserRouter>
      <ListsPage />
    </BrowserRouter>
  );

describe('ListsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'me', email: 'me@test.com' },
      token: 't',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('creating a list adds it to "Mis listas"', async () => {
    vi.mocked(ListAPI.getMine)
      .mockResolvedValueOnce({ data: { lists: [] } } as any)
      .mockResolvedValueOnce({
        data: { lists: [{ _id: 'l1', title: 'My RPGs', isPublic: false, ownerId: 'u1', collaboratorIds: [], games: [] }] },
      } as any);
    vi.mocked(ListAPI.create).mockResolvedValue({ data: {} } as any);

    renderLists();

    await waitFor(() => expect(screen.getByText(/Todavía no tienes listas/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Crear lista/i));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'My RPGs' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(ListAPI.create).toHaveBeenCalledWith({ title: 'My RPGs', description: '', isPublic: false });
    });
    await waitFor(() => expect(screen.getByText('My RPGs')).toBeInTheDocument());
  });

  it('lists owned and lists where the user collaborates', async () => {
    vi.mocked(ListAPI.getMine).mockResolvedValue({
      data: {
        lists: [
          { _id: 'l1', title: 'Owned list', isPublic: false, ownerId: 'u1', collaboratorIds: [], games: [] },
          { _id: 'l2', title: 'Shared list', isPublic: true, ownerId: 'u2', collaboratorIds: ['u1'], games: [{ rawgGameId: 1, title: 'A' }] },
        ],
      },
    } as any);

    renderLists();

    await waitFor(() => expect(screen.getByText('Owned list')).toBeInTheDocument());
    expect(screen.getByText('Shared list')).toBeInTheDocument();
    expect(screen.getByText(/colaboras/i)).toBeInTheDocument();
  });
});
