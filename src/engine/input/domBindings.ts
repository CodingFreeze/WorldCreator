import type { ActionMap } from "./ActionMap";

/** Wires DOM events into an ActionMap. Returns an unbind function. */
export function bindDomInput(map: ActionMap, canvas: HTMLCanvasElement): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    map.setKey(e.code, true);
  };
  const onKeyUp = (e: KeyboardEvent) => map.setKey(e.code, false);
  const onMouseDown = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    map.setKey(`Mouse${e.button}`, true);
  };
  const onMouseUp = (e: MouseEvent) => map.setKey(`Mouse${e.button}`, false);
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) {
      map.addMouseDelta(e.movementX, e.movementY);
    }
  };

  const onContextMenu = (e: Event) => e.preventDefault(); // right-click = aim, not menu

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
  };
}
