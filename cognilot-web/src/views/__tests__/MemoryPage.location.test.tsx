import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MemoryPage } from '../MemoryPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';

// Mocks
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    updateUser: vi.fn(),
  }),
}));

vi.mock('../../services/profile.service', () => ({
  profileService: {
    getActiveProfile: vi.fn().mockResolvedValue({
      data_learned: {},
      preferences: {},
    }),
    updateProfile: vi.fn().mockResolvedValue({}),
    clearCache: vi.fn(),
  },
}));

describe('MemoryPage Location Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn(),
    };
    (globalThis.navigator as any).geolocation = mockGeolocation;

    // Mock fetch
    globalThis.fetch = vi.fn() as any;
  });

  it('shows error toast when navigator.geolocation is missing', async () => {
    (globalThis.navigator as any).geolocation = undefined;

    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>
    );

    const detectBtn = await screen.findByText(/Autocompletar Ubicación/i);
    fireEvent.click(detectBtn);

    expect(toast.error).toHaveBeenCalledWith(
      'La geolocalización no es compatible con este navegador.'
    );
  });

  it('handles permission denied error', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) =>
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
        })
      ),
    };
    (globalThis.navigator as any).geolocation = mockGeolocation;

    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>
    );

    const detectBtn = await screen.findByText(/Autocompletar Ubicación/i);
    fireEvent.click(detectBtn);

    expect(toast.error).toHaveBeenCalledWith('Permiso de ubicación denegado por el usuario');
  });

  it('successfully detects location and updates profile', async () => {
    const mockCoords = { latitude: 40.7128, longitude: -74.006 };
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: mockCoords,
        })
      ),
    };
    (globalThis.navigator as any).geolocation = mockGeolocation;

    const mockAddress = {
      address: {
        country: 'Spain',
        city: 'Madrid',
        road: 'Calle Mayor',
        house_number: '1',
      },
    };

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAddress),
    });

    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>
    );

    const detectBtn = await screen.findByText(/Autocompletar Ubicación/i);
    fireEvent.click(detectBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'lat=40.7128&lon=-74.006&zoom=18&addressdetails=1&email=support@cognilot.app'
        )
      );
      expect(toast.success).toHaveBeenCalledWith('Ubicación autocompletada con éxito');
    });
  });
});
