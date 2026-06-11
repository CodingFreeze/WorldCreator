/**
 * Minimal quest state: each quest is at a named stage. Worlds define the
 * stage graph in their own logic; the log just tracks and serializes.
 */
export interface QuestSnapshot {
  [questId: string]: { stage: string };
}

export class QuestLog {
  private readonly quests = new Map<string, { stage: string }>();

  start(questId: string, initialStage: string): void {
    if (!this.quests.has(questId)) {
      this.quests.set(questId, { stage: initialStage });
    }
  }

  setStage(questId: string, stage: string): void {
    const q = this.quests.get(questId);
    if (!q) throw new Error(`quest ${questId} not started`);
    q.stage = stage;
  }

  stageOf(questId: string): string | null {
    return this.quests.get(questId)?.stage ?? null;
  }

  isAt(questId: string, stage: string): boolean {
    return this.stageOf(questId) === stage;
  }

  serialize(): QuestSnapshot {
    const out: QuestSnapshot = {};
    for (const [id, q] of this.quests) out[id] = { stage: q.stage };
    return out;
  }

  restore(snapshot: QuestSnapshot): void {
    this.quests.clear();
    for (const [id, q] of Object.entries(snapshot)) {
      this.quests.set(id, { stage: q.stage });
    }
  }
}
