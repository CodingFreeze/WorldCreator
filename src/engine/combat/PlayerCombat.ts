export type AttackKind = "melee1" | "melee2" | "melee3" | "bow" | "bolt";

export interface AttackEvent {
  kind: AttackKind;
  /** 1 + flow bonus — weaving styles builds flow. */
  damageMult: number;
  style: "melee" | "ranged" | "magic";
}

const MELEE_CHAIN: AttackKind[] = ["melee1", "melee2", "melee3"];
const MELEE_RECOVERY = 0.45;
const COMBO_WINDOW = 0.75; // after recovery, time to chain the next hit
const BOW_COOLDOWN = 0.9;
const BOLT_COOLDOWN = 1.2;
const FLOW_DECAY_DELAY = 4;
const FLOW_MAX = 3;
const FLOW_BONUS = 0.25;

/**
 * Player combat state machine: melee combos, bow, magic bolt, and the
 * weaving mechanic — switching styles while "hot" builds flow stacks that
 * multiply damage. Pure logic, fully headless-testable (spec §6).
 */
export class PlayerCombat {
  private comboIndex = 0;
  private recovery = 0; // time until next action allowed
  private comboTimer = 0; // time left to continue the combo
  private bowCd = 0;
  private boltCd = 0;
  private flowTimer = 0;
  flow = 0;
  private lastStyle: AttackEvent["style"] | null = null;

  update(dt: number): void {
    if (this.recovery > 0) this.recovery -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboIndex = 0;
    }
    if (this.bowCd > 0) this.bowCd -= dt;
    if (this.boltCd > 0) this.boltCd -= dt;
    if (this.flowTimer > 0) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) this.flow = 0;
    }
  }

  private weave(style: AttackEvent["style"]): number {
    if (this.lastStyle !== null && this.lastStyle !== style && this.flowTimer > 0) {
      this.flow = Math.min(FLOW_MAX, this.flow + 1);
    }
    this.lastStyle = style;
    this.flowTimer = FLOW_DECAY_DELAY;
    return 1 + this.flow * FLOW_BONUS;
  }

  tryMelee(): AttackEvent | null {
    if (this.recovery > 0) return null;
    const kind = MELEE_CHAIN[this.comboIndex] ?? "melee1";
    this.comboIndex = (this.comboIndex + 1) % MELEE_CHAIN.length;
    this.recovery = MELEE_RECOVERY;
    this.comboTimer = MELEE_RECOVERY + COMBO_WINDOW;
    return { kind, damageMult: this.weave("melee"), style: "melee" };
  }

  tryBow(): AttackEvent | null {
    if (this.recovery > 0 || this.bowCd > 0) return null;
    this.bowCd = BOW_COOLDOWN;
    this.recovery = 0.25;
    return { kind: "bow", damageMult: this.weave("ranged"), style: "ranged" };
  }

  tryBolt(): AttackEvent | null {
    if (this.recovery > 0 || this.boltCd > 0) return null;
    this.boltCd = BOLT_COOLDOWN;
    this.recovery = 0.35;
    return { kind: "bolt", damageMult: this.weave("magic"), style: "magic" };
  }

  get flowFraction(): number {
    return this.flow / FLOW_MAX;
  }
}
