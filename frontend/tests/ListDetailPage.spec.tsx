import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ListDetailPage } from '../src/pages/ListDetailPage';
import { ListsPage } from '../src/pages/ListsPage';
import { useAuth } from '../src/context/AuthContext';
import { ListAPI, RawgAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  ListAPI: {
    getOne: vi.fn(),
    getMine: vi.fn(),
    remove: vi.fn(),
    addGame: vi.fn(),
    removeGame: vi.fn(),
    addCollaborator: vi.fn(),
    removeCollaborator: vi.fn(),
  },
  RawgAPI: { searchGames: vi.fn() },
}));

const renderDetail = (listId = 'l1') =>
  render(
    <MemoryRouter initialEntries={[`/lists/${listId}`]}>
      <Routes>
        <Route path="/lists/:listId" element={<ListDetailPage />} />
        <Route path="/lists" element={<ListsPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ListDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a public list in read-only mode without crashing when viewer has no permission', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, token: null, loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(ListAPI.getOne).mockResolvedValue({
      data: { _id: 'l1', title: 'Public list', isPublic: true, ownerId: 'u2', collaboratorIds: [], games: [{ rawgGameId: 1, title: 'Game A' }] },
    } as any);

    renderDetail();

    await waitFor(() => expect(screen.getByText('Public list')).toBeInTheDocument());
    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.queryByText(/Añadir juego/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Colaboradores/i)).not.toBeInTheDocument();
  });

  it('shows a handled error message for a private list without permission (403), no crash', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', username: 'me', email: 'me@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(ListAPI.getOne).mockRejectedValue({ response: { status: 403 } });

    renderDetail();

    await waitFor(() => expect(screen.getByText(/No tienes permiso para ver esta lista/i)).toBeInTheDocument());
  });

  it('allows a collaborator to add a game; the add form is hidden for non-collaborators', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u3', username: 'collab', email: 'c@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(ListAPI.getOne).mockResolvedValue({
      data: { _id: 'l1', title: 'Shared list', isPublic: false, ownerId: 'u2', collaboratorIds: ['u3'], games: [] },
    } as any);
    vi.mocked(RawgAPI.searchGames).mockResolvedValue({ data: { results: [{ id: 7, name: 'Hades', background_image: 'h.jpg' }] } } as any);
    vi.mocked(ListAPI.addGame).mockResolvedValue({} as any);

    renderDetail();

    await waitFor(() => expect(screen.getByText(/Añadir juego/i)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Buscar un juego/i);
    fireEvent.change(searchInput, { target: { value: 'Hades' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => expect(screen.getByText('Hades')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Hades'));

    await waitFor(() => {
      expect(ListAPI.addGame).toHaveBeenCalledWith('l1', { rawgGameId: 7, title: 'Hades', coverImage: 'h.jpg' });
    });
  });

  it('only shows collaborator management to the owner', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u3', username: 'collab', email: 'c@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(ListAPI.getOne).mockResolvedValue({
      data: { _id: 'l1', title: 'Shared list', isPublic: false, ownerId: 'u2', collaboratorIds: ['u3'], games: [] },
    } as any);

    renderDetail();

    await waitFor(() => expect(screen.getByText('Shared list')).toBeInTheDocument());
    expect(screen.queryByText(/^Colaboradores$/i)).not.toBeInTheDocument();
  });

  it('deleting a list as the owner removes it from "Mis listas"', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', username: 'me', email: 'me@test.com' }, token: 't', loading: false, login: vi.fn(), logout: vi.fn() });
    vi.mocked(ListAPI.getOne).mockResolvedValue({
      data: { _id: 'l1', title: 'My list', isPublic: false, ownerId: 'u1', collaboratorIds: [], games: [] },
    } as any);
    vi.mocked(ListAPI.remove).mockResolvedValue({} as any);
    vi.mocked(ListAPI.getMine).mockResolvedValue({ data: { lists: [] } } as any);

    renderDetail();

    await waitFor(() => expect(screen.getByText('My list')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Eliminar lista/i));

    await waitFor(() => expect(ListAPI.remove).toHaveBeenCalledWith('l1'));
    await waitFor(() => expect(screen.getByText(/Todavía no tienes listas/i)).toBeInTheDocument());
  });
});
