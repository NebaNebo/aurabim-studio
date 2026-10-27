/**
 * Undo / Redo History Stack for AuraBIM
 */

export interface HistorySnapshot {
  timestamp: number;
  description: string;
  serializedState: string;
}

export class CommandHistory {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  public pushSnapshot(description: string, stateJson: string) {
    this.undoStack.push({
      timestamp: Date.now(),
      description,
      serializedState: stateJson
    });

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // New action invalidates redo stack
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1; // Keep initial state
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(currentStateJson: string): string | null {
    if (!this.canUndo()) return null;

    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push({
        timestamp: Date.now(),
        description: current.description,
        serializedState: currentStateJson
      });
    }

    const previous = this.undoStack[this.undoStack.length - 1];
    return previous ? previous.serializedState : null;
  }

  public redo(): string | null {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop();
    if (!next) return null;

    this.undoStack.push(next);
    return next.serializedState;
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
