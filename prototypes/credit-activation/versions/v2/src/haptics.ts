// Light haptic tick. Android and other browsers with the Vibration API get a very short pulse. iOS Safari has no
// Vibration API, but since iOS 18 toggling a native switch (<input type="checkbox" switch>) through its label
// plays the system selection haptic, also when the toggle comes from script during a user gesture.
let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement {
  if (label) return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.className = 'haptic-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.append(input);
  document.body.append(label);
  return label;
}

/** Shortest pulse the Vibration API reliably plays as a «tick». */
const PULSE_MS = 8;

export function hapticTick(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(PULSE_MS);
    return;
  }
  iosSwitch().click();
}
