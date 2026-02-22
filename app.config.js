// app.config.js
export default ({ config }) => {
  const iosBundleId =
    config.ios?.bundleIdentifier ?? "com.bryanb1947.nattycheck";
  const androidPackage =
    config.android?.package ?? "com.bryanb1947.nattycheck";

  const IOS_BUILD_NUMBER = "2";
  const EAS_PROJECT_ID = "72775517-8816-4db0-a8b8-f8a8938aff48";

  return {
    ...config,

    owner: "nattycheck",
    scheme: config.scheme ?? "nattycheck",
    name: config.name ?? "NattyCheck",
    slug: config.slug ?? "nattycheck",

    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0B0C"
    },

    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`
    },

    // ✅ REQUIRED for bare workflow
    runtimeVersion: "1.0.0",

    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: iosBundleId,
      buildNumber: IOS_BUILD_NUMBER,
      usesAppleSignIn: true
    },

    android: {
      ...(config.android ?? {}),
      package: androidPackage
    },

    extra: {
      ...(config.extra ?? {}),
      eas: {
        projectId: EAS_PROJECT_ID
      },

      EXPO_PUBLIC_REVENUECAT_IOS_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_TIMEOUT_MS: process.env.EXPO_PUBLIC_TIMEOUT_MS
    }
  };
};