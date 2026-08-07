/* Simple event bus for drawer open/close communication
 * between BottomNav "More" button and HamburgerDrawer. */

type Listener = () => void;

const listeners: Listener[] = [];

export function openDrawer() {
  listeners.forEach((fn) => fn());
}

export function onDrawerOpen(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
