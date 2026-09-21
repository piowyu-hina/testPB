export function element<T extends HTMLElement = HTMLElement>(id: string, root: ParentNode = document): T {
  const node = root.querySelector(`#${CSS.escape(id)}`);
  if (!node) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}

export function mountScreenRoot(host: HTMLElement, template: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'screen-root';
  root.hidden = true;
  root.innerHTML = template;
  host.append(root);
  return root;
}

// Mouse/touch actions only; keyboard-generated clicks do not spend a turn.
export function onClick(node: HTMLElement, action: (event: MouseEvent) => void): void {
  node.addEventListener('click', (event) => {
    if (event.detail > 0) action(event);
  });
}
