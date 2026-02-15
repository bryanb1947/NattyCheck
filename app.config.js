// app.config.js
export default ({ config }) => {
  const iosBundleId = config.ios?.bundleIdentifier ?? "com.bryanb1947.nattycheck";
  const androidPackage = config.android?.package ?? "com.bryanb1947.nattycheck";

  // ✅ IMPORTANT:
  // Apple/TestFlight requires CFBundleVersion to be unique per upload.
  // With EAS, that maps to expo.ios.buildNumber (string).
  // Bump this every time you submit (2, 3, 4, ...).
  const IOS_BUILD_NUMBER = "2";

  return {
    ...config,

    // ✅ REQUIRED for EAS when using an Expo account org
    owner: "nattycheck",

    scheme: config.scheme ?? "nattycheck",

    name: config.name ?? "NattyCheck",
    slug: config.slug ?? "nattycheck",

    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: iosBundleId,
      buildNumber: IOS_BUILD_NUMBER,

      // ✅ REQUIRED for native "Sign in with Apple" sheet (Face ID UI)
      // Prevents web redirect OAuth flow and enables the native capability.
      usesAppleSignIn: true,
    },

    android: {
      ...(config.android ?? {}),
      package: androidPackage,
    },

    extra: {
      ...(config.extra ?? {}),

      // ✅ EAS project id
      eas: {
        projectId: "72775517-8816-4db0-a8b8-f8a8938aff48",
      },

      // Public runtime config
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_TIMEOUT_MS: process.env.EXPO_PUBLIC_TIMEOUT_MS,
    },
  };
};
