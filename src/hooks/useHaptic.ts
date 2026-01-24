/**
 * Haptic feedback hook for mobile devices
 * Uses the Vibration API where supported
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  warning: [30, 50, 30],
  error: [50, 100, 50, 100, 50],
  selection: 5,
};

const isHapticSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

const triggerHaptic = (type: HapticType = 'light'): void => {
  if (!isHapticSupported()) return;
  
  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not allowed
    console.debug('Haptic feedback not available:', error);
  }
};

export function useHaptic() {
  const haptic = (type: HapticType = 'light') => {
    triggerHaptic(type);
  };

  const lightTap = () => triggerHaptic('light');
  const mediumTap = () => triggerHaptic('medium');
  const heavyTap = () => triggerHaptic('heavy');
  const success = () => triggerHaptic('success');
  const warning = () => triggerHaptic('warning');
  const error = () => triggerHaptic('error');
  const selection = () => triggerHaptic('selection');

  return {
    haptic,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    selection,
    isSupported: isHapticSupported(),
  };
}

// Standalone functions for use outside of React components
export { triggerHaptic, isHapticSupported };
