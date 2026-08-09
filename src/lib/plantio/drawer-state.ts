/* Simple event bus for drawer open/close communication
 * between BottomNav "More" button, HamburgerDrawer, and TopBar. */

type Listener = () => void;
type StateListener = (open: boolean) => void;

const openListeners: Listener[] = [];
const stateListeners: StateListener[] = [];

let _isOpen = false;

export function openDrawer() {
  _isOpen = true;
  openListeners.forEach((fn) => fn());
  stateListeners.forEach((fn) => fn(true));
}

export function closeDrawer() {
  _isOpen = false;
  stateListeners.forEach((fn) => fn(false));
}

export function onDrawerOpen(fn: Listener) {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx !== -1) openListeners.splice(idx, 1);
  };
}

/* Subscribe to drawer open/close state changes.
 * Returns the current state synchronously via getDrawerIsOpen(). */
export function onDrawerStateChange(fn: StateListener) {
  stateListeners.push(fn);
  return () => {
    const idx = stateListeners.indexOf(fn);
    if (idx !== -1) stateListeners.splice(idx, 1);
  };
}

export function getDrawerIsOpen() {
  return _isOpen;
}
