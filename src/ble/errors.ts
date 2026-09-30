// Which Settings screen can fix the problem
export type SettingsFix = 'bluetooth' | 'location' | 'app';

export type FriendlyError = {
  message: string;
  fix?: SettingsFix;
};

// An Error whose message can be shown as-is, optionally pointing at the Settings screen that fixes it
export type BleFailure = Error & { fix?: SettingsFix };

export function bleFailure(message: string, fix?: SettingsFix): BleFailure {
  return Object.assign(new Error(message), { fix });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function describeError(error: unknown): FriendlyError {
  const fix = error instanceof Error ? (error as BleFailure).fix : undefined;
  return fix ? { message: errorMessage(error), fix } : { message: errorMessage(error) };
}
