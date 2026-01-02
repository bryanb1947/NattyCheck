export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.replace(/\/+$/, "") ?? "http://10.0.2.2:5000";

export const REQUEST_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_TIMEOUT_MS ?? 45000
);

export const BUILD = {
  appName: "NattyCheck",
  version: "0.10.0",
};
