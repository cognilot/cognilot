import { render, screen, fireEvent } from '@testing-library/react';
import { OverviewHub } from '../overview/OverviewHub';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../../services/api', () => ({
  api: {
    uploadFile: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
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

describe('OverviewHub Component', () => {
  const mockDetectLocation = vi.fn();
  const mockCVUpload = vi.fn();
  const mockAddQuickKey = vi.fn();
  const mockOpenDrawer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status banner and all 3 horizontal rows with clean labels', () => {
    render(
      <OverviewHub
        totalLearnedCount={23}
        userPlan="PRO"
        onDetectLocation={mockDetectLocation}
        isLocating={false}
        onCVUpload={mockCVUpload}
        onAddQuickKey={mockAddQuickKey}
        onOpenDrawer={mockOpenDrawer}
      />
    );

    expect(screen.getByText(/Cognilot Core Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Contextual Autofill Ready/i)).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();

    // 3 Rows
    expect(screen.getByText(/Geographic Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Career History & Resume \(CV\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Profile Attributes/i)).toBeInTheDocument();
  });

  it('triggers location detection on GPS button click', () => {
    render(
      <OverviewHub
        totalLearnedCount={0}
        onDetectLocation={mockDetectLocation}
        isLocating={false}
        onCVUpload={mockCVUpload}
        onAddQuickKey={mockAddQuickKey}
        onOpenDrawer={mockOpenDrawer}
      />
    );

    const gpsBtn = screen.getByText(/Detect Location \(GPS\)/i);
    fireEvent.click(gpsBtn);
    expect(mockDetectLocation).toHaveBeenCalledTimes(1);
  });

  it('toggles CV uploader dropzone', () => {
    render(
      <OverviewHub
        totalLearnedCount={0}
        onDetectLocation={mockDetectLocation}
        isLocating={false}
        onCVUpload={mockCVUpload}
        onAddQuickKey={mockAddQuickKey}
        onOpenDrawer={mockOpenDrawer}
      />
    );

    const cvBtn = screen.getByText(/Upload Resume \/ CV/i);
    fireEvent.click(cvBtn);
    expect(screen.getByText(/Completar con IA/i)).toBeInTheDocument();
  });

  it('handles quick key-value addition and drawer opening', () => {
    render(
      <OverviewHub
        totalLearnedCount={5}
        onDetectLocation={mockDetectLocation}
        isLocating={false}
        onCVUpload={mockCVUpload}
        onAddQuickKey={mockAddQuickKey}
        onOpenDrawer={mockOpenDrawer}
      />
    );

    const keyInput = screen.getByPlaceholderText(/Key \(e\.g\. github\)/i);
    const valInput = screen.getByPlaceholderText(/Value/i);

    fireEvent.change(keyInput, { target: { value: 'linkedin' } });
    fireEvent.change(valInput, { target: { value: 'in/jackarana' } });
    fireEvent.keyDown(valInput, { key: 'Enter', code: 'Enter' });

    expect(mockAddQuickKey).toHaveBeenCalledWith('linkedin', 'in/jackarana');

    const drawerBtn = screen.getByText(/Manage All \(5\)/i);
    fireEvent.click(drawerBtn);
    expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
  });
});
