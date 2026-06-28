import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyListsSection } from '../src/components/MyListsSection';
import { useAuth } from '../src/context/AuthContext';
import { ListAPI } from '../src/services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  ListAPI: { create: vi.fn(), getMine: vi.fn(), remove: vi.fn() },
}));

const renderSection = () =>
  render(
    <BrowserRouter>
      <MyListsSection />
    </BrowserRouter>
  );

describe('MyListsSection', () => {
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

  it('creating a list adds it to "Tus listas"', async () => {
    vi.mocked(ListAPI.getMine)
      .mockResolvedValueOnce({ data: { lists: [] } } as any)
      .mockResolvedValueOnce({
        data: { lists: [{ _id: 'l1', title: 'My RPGs', isPublic: false, ownerId: 'u1', collaborators: [], games: [] }] },
      } as any);
    vi.mocked(ListAPI.create).mockResolvedValue({ data: { list: {} } } as any);

    renderSection();

    await waitFor(() => expect(screen.getByText(/Todavía no tienes listas/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText('Crear lista'));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'My RPGs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(ListAPI.create).toHaveBeenCalledWith({ title: 'My RPGs', description: '', isPublic: false });
    });
    await waitFor(() => expect(screen.getByText('My RPGs')).toBeInTheDocument());
  });

  it('lists owned and lists where the user collaborates', async () => {
    vi.mocked(ListAPI.getMine).mockResolvedValue({
      data: {
        lists: [
          { _id: 'l1', title: 'Owned list', isPublic: false, ownerId: 'u1', collaborators: [], games: [] },
          { _id: 'l2', title: 'Shared list', isPublic: true, ownerId: 'u2', collaborators: [{ userId: 'u1', username: 'me' }], games: [{ rawgGameId: 1, title: 'A' }] },
        ],
      },
    } as any);

    renderSection();

    await waitFor(() => expect(screen.getByText('Owned list')).toBeInTheDocument());
    expect(screen.getByText('Shared list')).toBeInTheDocument();
    expect(screen.getByText(/colaboras/i)).toBeInTheDocument();
  });
});
