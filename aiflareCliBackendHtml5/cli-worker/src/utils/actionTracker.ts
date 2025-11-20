export class ActionTracker {
  private readonly inFlight = new Set<string>();

  begin(actionId: string): boolean {
    if (this.inFlight.has(actionId)) {
      return false;
    }
    this.inFlight.add(actionId);
    return true;
  }

  end(actionId: string): void {
    this.inFlight.delete(actionId);
  }
}
