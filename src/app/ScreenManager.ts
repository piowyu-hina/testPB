export interface Screen {
  readonly root: HTMLElement;
  enter(): void;
  leave?(): void;
  canLeave?(): boolean;
}

// Mount once: navigation does not recreate listeners or game state.
export class ScreenManager<Id extends string> {
  private active: Id | null = null;
  private readonly screens: Record<Id, Screen>;
  constructor(screens: Record<Id, Screen>) {
    this.screens = screens;
    for (const screen of Object.values<Screen>(screens)) screen.root.hidden = true;
  }
  go(id: Id): boolean {
    const next = this.screens[id];
    if (!next) throw new Error(`Unknown screen: ${id}`);
    if (id === this.active) return true;
    const previous = this.active === null ? undefined : this.screens[this.active];
    if (previous?.canLeave?.() === false) return false;
    previous?.leave?.();
    if (previous) previous.root.hidden = true;
    next.root.hidden = false;
    this.active = id;
    next.enter();
    return true;
  }
}
