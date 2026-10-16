// Light haptic tick. Browsers with the Vibration API (Android) get a very short pulse. iOS Safari has none, but
// since iOS 18 toggling a native switch (<input type="checkbox" switch>) through its label plays the system
// selection haptic. WebKit plays it only while it handles a user gesture, so call this from a touch event
// handler (touchstart / touchmove / touchend), not from `input` or `change`.

/** Shortest pulse the Vibration API reliably plays as a «tick». */
const PULSE_MS = 8;

export function hapticTick(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(PULSE_MS);
    return;
  }
  const label = document.createElement('label');
  label.ariaHidden = 'true';
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}
