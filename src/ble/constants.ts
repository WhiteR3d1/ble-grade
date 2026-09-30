// UUIDs of the instructor's BLE device (given in the assignment)
export const SERVICE_UUID = 'aee04821-1973-4e1f-a590-e84b10d580e7';
export const CHAR_UUID = 'cde07b1a-889b-44b7-a99f-c888dddac729';

export const SCAN_DURATION_MS = 10_000;
export const CONNECT_TIMEOUT_MS = 10_000;

// A larger MTU lets a long "name & buddy" value go out in a single packet (Android only)
export const PREFERRED_MTU = 185;
