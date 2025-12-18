import { renderHook } from '@testing-library/react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

describe('useSessionTimeout', () => {
  const mockOnTimeout = jest.fn();
  const mockOnWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should call onWarning when warning time is reached', () => {
    renderHook(() => useSessionTimeout({
      timeout: 30000, // 30 seconds
      onTimeout: mockOnTimeout,
      onWarning: mockOnWarning,
      warningTime: 10000, // 10 seconds
      isAuthenticated: true
    }));

    // Fast forward to warning time
    jest.advanceTimersByTime(20000); // 20 seconds (30 - 10)
    
    expect(mockOnWarning).toHaveBeenCalledWith(10000);
    expect(mockOnTimeout).not.toHaveBeenCalled();
  });

  it('should call onTimeout when session expires', () => {
    renderHook(() => useSessionTimeout({
      timeout: 30000,
      onTimeout: mockOnTimeout,
      onWarning: mockOnWarning,
      warningTime: 10000,
      isAuthenticated: true
    }));

    // Fast forward to timeout
    jest.advanceTimersByTime(30000);
    
    expect(mockOnTimeout).toHaveBeenCalled();
  });

  it('should not start timers when not authenticated', () => {
    renderHook(() => useSessionTimeout({
      timeout: 30000,
      onTimeout: mockOnTimeout,
      onWarning: mockOnWarning,
      warningTime: 10000,
      isAuthenticated: false
    }));

    jest.advanceTimersByTime(30000);
    
    expect(mockOnWarning).not.toHaveBeenCalled();
    expect(mockOnTimeout).not.toHaveBeenCalled();
  });
});