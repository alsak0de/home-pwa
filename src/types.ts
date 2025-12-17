export type AlarmState = 'armed' | 'disarmed';
export type GarageState = 'open' | 'closed';
export type DrivewayState = 'open' | 'closed';
export type LockState = 'enabled' | 'disabled';
export type LightState = 'on' | 'off';

export type Targets =
  | 'alarm'
  | 'lock'
  | 'garage'
  | 'driveway'
  | 'pool'
  | 'garden'
  | 'porch'
  | 'backyard';

export type StatusResponse = {
  alarm: AlarmState;
  garage: GarageState;
  driveway: DrivewayState;
  lock?: LockState;
  pool?: LightState;
  garden?: LightState;
  porch?: LightState;
  backyard?: LightState;
};

export type ActionRequest = {
  button: Targets;
};

export type ActionResponse = {
  ok: boolean;
  status?: StatusResponse;
};

export type AlarmState = { armed: boolean };
export type GarageState = { open: boolean };
export type DrivewayState = { open: boolean };
export type LockState = { locked: boolean };

export type StatusResponse = {
	alarm: AlarmState;
	garage: GarageState;
	driveway: DrivewayState;
	lock?: LockState;
};

export type ActionTarget = 'alarm' | 'lock' | 'garage' | 'driveway';
export type Command = 'toggle' | 'arm' | 'disarm' | 'open' | 'close' | 'lock' | 'unlock';

export type ActionRequest = {
	target: ActionTarget;
	command: Command;
};

export type ActionResponse = {
	ok: boolean;
	status?: Partial<StatusResponse>;
};

export type AuthState = 'authenticated' | 'unauthenticated' | 'unknown';

export type AlarmStatus = {
  armed: boolean;
};

export type DoorStatus = {
  open: boolean;
};

export type LockStatus = {
  locked: boolean;
};

export type StatusResponse = {
  alarm: AlarmStatus;
  garage: DoorStatus;
  driveway: DoorStatus;
  lock?: LockStatus; // optional per requirements
};

export type ControlTarget = "alarm" | "lock" | "garage" | "driveway";

export type Command =
  | "toggle"
  | "arm"
  | "disarm"
  | "open"
  | "close"
  | "lock"
  | "unlock";

export type ActionRequest = {
  target: ControlTarget;
  command: Command;
};

export type ActionResponse = {
  ok: boolean;
  status?: StatusResponse;
};

export type ApiError =
  | { type: "unauthenticated"; message?: string }
  | { type: "timeout"; message?: string }
  | { type: "network"; message?: string }
  | { type: "http"; status: number; message?: string }
  | { type: "parse"; message?: string };


