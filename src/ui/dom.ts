export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}

// Mouse/touch actions only; keyboard-generated clicks do not spend a turn.
export function onClick(node: HTMLElement, action: (event: MouseEvent) => void): void {
  node.addEventListener('click', (event) => {
    if (event.detail > 0) action(event);
  });
}
