export type EnemyState = "idle" | "chase" | "windup" | "recover" | "dead";

export interface EnemyTuning {
  /** Distance at which the enemy notices the player. */
  aggroRange: number;
  /** Preferred attack distance (melee: small; ranged: large). */
  attackRange: number;
  /** Ranged archetypes back away if the player gets closer than this. */
  minRange: number;
  windupSec: number;
  recoverSec: number;
  speed: number;
}

export const THORNLING_TUNING: EnemyTuning = {
  aggroRange: 11,
  attackRange: 1.4,
  minRange: 0,
  windupSec: 0.45,
  recoverSec: 0.8,
  speed: 2.6,
};

export const EMBERWISP_TUNING: EnemyTuning = {
  aggroRange: 14,
  attackRange: 9,
  minRange: 5,
  windupSec: 0.8,
  recoverSec: 1.4,
  speed: 1.8,
};

export interface BrainOutput {
  /** Desired movement along the player axis: +1 toward, -1 away, 0 hold. */
  moveToward: number;
  /** Fires exactly once when the windup completes. */
  attack: boolean;
}

/** Distance-based enemy FSM. Pure logic — movement applied by the world. */
export class EnemyBrain {
  state: EnemyState = "idle";
  private timer = 0;

  constructor(readonly tuning: EnemyTuning) {}

  update(dt: number, distToPlayer: number, alive: boolean): BrainOutput {
    if (!alive) {
      this.state = "dead";
      return { moveToward: 0, attack: false };
    }

    switch (this.state) {
      case "idle":
        if (distToPlayer < this.tuning.aggroRange) this.state = "chase";
        return { moveToward: 0, attack: false };

      case "chase": {
        if (distToPlayer > this.tuning.aggroRange * 1.6) {
          this.state = "idle";
          return { moveToward: 0, attack: false };
        }
        if (distToPlayer <= this.tuning.attackRange && distToPlayer >= this.tuning.minRange) {
          this.state = "windup";
          this.timer = this.tuning.windupSec;
          return { moveToward: 0, attack: false };
        }
        // Too close for a ranged archetype -> retreat; otherwise approach.
        const dir = distToPlayer < this.tuning.minRange ? -1 : 1;
        return { moveToward: dir, attack: false };
      }

      case "windup":
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = "recover";
          this.timer = this.tuning.recoverSec;
          return { moveToward: 0, attack: true };
        }
        return { moveToward: 0, attack: false };

      case "recover":
        this.timer -= dt;
        if (this.timer <= 0) this.state = "chase";
        return { moveToward: 0, attack: false };

      case "dead":
        return { moveToward: 0, attack: false };
    }
  }
}
