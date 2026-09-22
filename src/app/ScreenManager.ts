export interface Screen {
  readonly root: HTMLElement;
  enter(): void;
  leave?(): void;
  canLeave?(): boolean;
}

// Mount once: navigation does not recreate listeners or game state.
export class ScreenManager<Id extends string> {
  private active: Id | null = null;
  private transitioning = false;
  private readonly screens: Record<Id, Screen>;
  private readonly transition?: (swap: () => void) => Promise<void>;
  constructor(screens: Record<Id, Screen>, transition?: (swap: () => void) => Promise<void>) {
    this.screens = screens;
    this.transition = transition;
    for (const screen of Object.values<Screen>(screens)) screen.root.hidden = true;
  }
  go(id: Id): boolean {
    const next = this.screens[id];
    if (!next) throw new Error(`Unknown screen: ${id}`);
    if (id === this.active) return true;
    if (this.transitioning) return false;
    const previous = this.active === null ? undefined : this.screens[this.active];
    if (previous?.canLeave?.() === false) return false;
    const swap = () => {
      previous?.leave?.();
      if (previous) previous.root.hidden = true;
      next.root.hidden = false;
      this.active = id;
      next.enter();
    };
    if (previous && this.transition) {
      this.transitioning = true;
      void this.transition(swap).finally(() => { this.transitioning = false; });
    } else swap();
    return true;
  }
}
