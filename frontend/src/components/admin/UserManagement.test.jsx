import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from './UserManagement';
import { fetchAdminUsersApi } from '../../api';

vi.mock('../../api', () => ({
  fetchAdminUsersApi: vi.fn(),
  createAdminUserApi: vi.fn(),
  updateAdminUserApi: vi.fn(),
  deactivateAdminUserApi: vi.fn(),
  activateAdminUserApi: vi.fn(),
}));

describe('UserManagement pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders pagination metadata from API and requests next page', async () => {
    fetchAdminUsersApi
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            email: 'u1@example.com',
            role: 'user',
            is_active: true,
            created_at: '2026-03-10T00:00:00Z',
          },
        ],
        total: 12,
        total_pages: 2,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 11,
            email: 'u11@example.com',
            role: 'user',
            is_active: true,
            created_at: '2026-03-10T00:00:00Z',
          },
        ],
        total: 12,
        total_pages: 2,
      });

    const user = userEvent.setup();
    render(<UserManagement token="token" />);

    await waitFor(() => {
      expect(fetchAdminUsersApi).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    });

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 10 of 12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => {
      expect(fetchAdminUsersApi).toHaveBeenLastCalledWith({ page: 2, page_size: 10 });
    });

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 11 to 12 of 12')).toBeInTheDocument();
  });

  it('falls back to a single visible page when API returns no total_pages', async () => {
    fetchAdminUsersApi.mockResolvedValue({
      data: [],
      total: 0,
    });

    render(<UserManagement token="token" />);

    await waitFor(() => {
      expect(fetchAdminUsersApi).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    });

    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument();
    expect(await screen.findByText('No users found')).toBeInTheDocument();
  });
});
