/* Event bus for AskPlantioModal — any component can open the AI chat
 * by calling openAskPlantio(context), and the mounted <AskPlantioModal />
 * in AppShell will respond. */

export interface AskPlantioContext {
  plant_name?: string | null;
  plant_name_hi?: string | null;
  plant_name_local?: string | null;
  disease_name?: string | null;
  disease_name_hi?: string | null;
  is_healthy?: boolean;
  symptoms_summary?: string | null;
  symptoms_summary_hi?: string | null;
}

type OpenListener = (ctx: AskPlantioContext) => void;
type CloseListener = () => void;

const openListeners: OpenListener[] = [];
const closeListeners: CloseListener[] = [];

let _isOpen = false;

/** Open the Ask Plantio modal, optionally passing plant/disease context. */
export function openAskPlantio(ctx: AskPlantioContext = {}) {
  _isOpen = true;
  openListeners.forEach((fn) => fn(ctx));
}

/** Close the Ask Plantio modal. */
export function closeAskPlantio() {
  _isOpen = false;
  closeListeners.forEach((fn) => fn());
}

/** Subscribe to open events. Returns unsubscribe function. */
export function onAskPlantioOpen(fn: OpenListener) {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx !== -1) openListeners.splice(idx, 1);
  };
}

/** Subscribe to close events. Returns unsubscribe function. */
export function onAskPlantioClose(fn: CloseListener) {
  closeListeners.push(fn);
  return () => {
    const idx = closeListeners.indexOf(fn);
    if (idx !== -1) closeListeners.splice(idx, 1);
  };
}

export function getAskPlantioIsOpen() {
  return _isOpen;
}
