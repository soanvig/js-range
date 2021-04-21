interface Ctor {
  container: HTMLElement;
}

export class Renderer {
  private container: HTMLElement;
  private rafId: number | null = null;

  private constructor (ctor: Ctor) {
    this.container = ctor.container;

    this.container.classList.add('jsr');
  }

  public getContainer () {
    return this.container;
  }

  public addChild (child: HTMLElement) {
    this.container.appendChild(child);
  }

  public positionToRelative (x: number): number {
    return (x - this.container.getBoundingClientRect().left) / this.container.offsetWidth;
  }

  public distanceToRelative (distance: number): number {
    return distance / this.container.offsetWidth;
  }

  public render (renderFunctions: VoidFunction[]): void {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
    }

    this.rafId = window.requestAnimationFrame(() => {
      renderFunctions.forEach(f => f());
      this.rafId = null;
    });
  }

  public static init (ctor: Ctor) {
    return new Renderer(ctor);
  }
}