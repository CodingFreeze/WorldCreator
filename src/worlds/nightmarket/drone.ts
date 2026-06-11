export type DroneMode = "patrol" | "suspicious" | "alarm";

export interface DroneOutput {
  mode: DroneMode;
  /** Index of the waypoint currently steered toward (patrol mode). */
  waypoint: number;
  /** True on the single tick the alarm triggers. */
  alarmTriggered: boolean;
}

export const DRONE_VIEW_RANGE = 9;
export const DRONE_VIEW_HALF_ANGLE = 0.7; // rad, ~80 degree cone
const SUSPICION_TIME = 1.1;
const ALARM_TIME = 5;
const WAYPOINT_ARRIVE = 1.5;

/**
 * Security drone core: patrols waypoints; hacking in its vision cone builds
 * suspicion, then trips the alarm (credits penalty applied by the world).
 * Pure logic — position integration happens outside.
 */
export class DroneCore {
  mode: DroneMode = "patrol";
  waypoint = 0;
  private timer = 0;

  constructor(private readonly waypointCount: number) {}

  update(
    dt: number,
    arrivedAtWaypoint: boolean,
    seesHacker: boolean,
  ): DroneOutput {
    let alarmTriggered = false;

    switch (this.mode) {
      case "patrol":
        if (arrivedAtWaypoint) this.waypoint = (this.waypoint + 1) % this.waypointCount;
        if (seesHacker) {
          this.mode = "suspicious";
          this.timer = SUSPICION_TIME;
        }
        break;
      case "suspicious":
        if (!seesHacker) {
          this.mode = "patrol";
        } else {
          this.timer -= dt;
          if (this.timer <= 0) {
            this.mode = "alarm";
            this.timer = ALARM_TIME;
            alarmTriggered = true;
          }
        }
        break;
      case "alarm":
        this.timer -= dt;
        if (this.timer <= 0) this.mode = "patrol";
        break;
    }

    return { mode: this.mode, waypoint: this.waypoint, alarmTriggered };
  }
}

/** Is the target inside the drone's vision cone? Pure helper. */
export function droneSees(
  droneX: number,
  droneZ: number,
  droneFacing: number,
  targetX: number,
  targetZ: number,
): boolean {
  const dx = targetX - droneX;
  const dz = targetZ - droneZ;
  const dist = Math.hypot(dx, dz);
  if (dist > DRONE_VIEW_RANGE) return false;
  if (dist < 0.5) return true;
  const fx = Math.sin(droneFacing);
  const fz = Math.cos(droneFacing);
  const dot = (fx * dx + fz * dz) / dist;
  return Math.acos(Math.max(-1, Math.min(1, dot))) < DRONE_VIEW_HALF_ANGLE;
}

export const WAYPOINT_ARRIVE_DIST = WAYPOINT_ARRIVE;
