// Sound effects using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export function playBuildingTap() {
  if (!audioContext) return;
  // Cute "pop" sound
  playTone(600, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(800, 0.08, 'sine', 0.1), 50);
}

export function playBuildingHover() {
  if (!audioContext) return;
  // Soft hover sound
  playTone(400, 0.05, 'sine', 0.05);
}

export function playSuccess() {
  if (!audioContext) return;
  // Happy success jingle
  playTone(523, 0.1, 'sine', 0.1); // C5
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 100); // E5
  setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 200); // G5
}

export function playWelcome() {
  if (!audioContext) return;
  // Welcome chime
  playTone(392, 0.15, 'sine', 0.08); // G4
  setTimeout(() => playTone(523, 0.15, 'sine', 0.08), 150); // C5
  setTimeout(() => playTone(659, 0.2, 'sine', 0.08), 300); // E5
}
