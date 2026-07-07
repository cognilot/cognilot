import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CVUploader } from '../CVUploader';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../../services/api', () => ({
  api: {
    uploadFile: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('CVUploader Component', () => {
  const mockOnUploadSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<CVUploader onUploadSuccess={mockOnUploadSuccess} />);
    expect(screen.getByText(/Completar con IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrastra tu CV aquí/i)).toBeInTheDocument();
  });

  it('handles successful file upload', async () => {
    const mockData = { full_name: 'Juan Perez', email: 'juan@example.com' };
    (api.uploadFile as any).mockResolvedValue(mockData);

    render(<CVUploader onUploadSuccess={mockOnUploadSuccess} />);

    // Simulate file selection
    const file = new File(['%PDF-1.4...'], 'cv.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('cv-file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.uploadFile).toHaveBeenCalledWith('/onboarding/parse-cv', file);
      expect(toast.success).toHaveBeenCalledWith('¡CV Procesado!', expect.anything());
      expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('shows warning when no data is extracted', async () => {
    const emptyData = { full_name: '', email: null };
    (api.uploadFile as any).mockResolvedValue(emptyData);

    render(<CVUploader onUploadSuccess={mockOnUploadSuccess} />);

    const file = new File(['%PDF-1.4...'], 'cv.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('cv-file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        'No se pudo extraer mucha información',
        expect.anything()
      );
    });
  });

  it('handles API errors (e.g. 413 File Too Large)', async () => {
    const error413 = { status: 413, message: 'Payload Too Large' };
    (api.uploadFile as any).mockRejectedValue(error413);

    render(<CVUploader onUploadSuccess={mockOnUploadSuccess} />);

    const file = new File(['%PDF-1.4...'], 'cv.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('cv-file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Archivo demasiado grande', expect.anything());
    });
  });
});
