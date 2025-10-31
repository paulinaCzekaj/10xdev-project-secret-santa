import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '@/lib/notifications';
import { toast } from 'sonner';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success()', () => {
    it('should display success notification with message key', () => {
      notify.success('AUTH.LOGIN_SUCCESS');

      expect(toast.success).toHaveBeenCalledWith(
        'Zalogowano pomyślnie!',
        expect.objectContaining({ description: undefined })
      );
    });

    it('should display success notification with custom message', () => {
      notify.success({ title: 'Custom', description: 'Desc' });

      expect(toast.success).toHaveBeenCalledWith(
        'Custom',
        expect.objectContaining({ description: 'Desc' })
      );
    });

    it('should pass options to toast', () => {
      notify.success('AUTH.LOGIN_SUCCESS', { duration: 5000 });

      expect(toast.success).toHaveBeenCalledWith(
        'Zalogowano pomyślnie!',
        expect.objectContaining({ duration: 5000 })
      );
    });
  });

  describe('error()', () => {
    it('should display error notification with message key', () => {
      notify.error('AUTH.LOGIN_ERROR');

      expect(toast.error).toHaveBeenCalledWith(
        'Błąd logowania',
        expect.objectContaining({
          description: 'Nieprawidłowy email lub hasło'
        })
      );
    });

    it('should display error notification with custom message', () => {
      notify.error({ title: 'API Error', description: 'Details' });

      expect(toast.error).toHaveBeenCalledWith(
        'API Error',
        expect.objectContaining({ description: 'Details' })
      );
    });
  });

  describe('info()', () => {
    it('should display info notification', () => {
      notify.info('AUTH.TERMS_INFO');

      expect(toast.info).toHaveBeenCalled();
    });
  });

  describe('warning()', () => {
    it('should display warning notification', () => {
      notify.warning('EXCLUSION.ADD_PARTIAL_SUCCESS');

      expect(toast.warning).toHaveBeenCalled();
    });
  });

  describe('show()', () => {
    it('should display notification with specified type', () => {
      notify.show('success', 'AUTH.LOGIN_SUCCESS');

      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('dismiss()', () => {
    it('should dismiss specific toast by ID', () => {
      notify.dismiss('toast-id');

      expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
    });

    it('should dismiss all toasts when no ID provided', () => {
      notify.dismiss();

      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe('getMessage()', () => {
    it('should return message for valid key', () => {
      const message = notify.getMessage('AUTH.LOGIN_SUCCESS');

      expect(message).toEqual({
        title: 'Zalogowano pomyślnie!',
        description: undefined,
        type: 'success'
      });
    });

    it('should return undefined for invalid key', () => {
      const message = notify.getMessage('INVALID.KEY' as any);

      expect(message).toBeUndefined();
    });
  });

  describe('Unknown message key handling', () => {
    it('should use unknown key as title with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      notify.success('UNKNOWN.KEY');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown message key')
      );
      expect(toast.success).toHaveBeenCalledWith(
        'UNKNOWN.KEY',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});
