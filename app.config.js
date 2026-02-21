// app.config.js
export default ({ config }) => {
  const iosBundleId = config.ios?.bundleIdentifier ?? "com.bryanb1947.nattycheck";
  const androidPackage = config.android?.package ?? "com.bryanb1947.nattycheck";

  // Apple/TestFlight requires CFBundleVersion to be unique per upload.
  // With EAS, that maps to expo.ios.buildNumber (string). Bump every upload.
  const IOS_BUILD_NUMBER = "2";

  return {
    ...config,

    // ✅ EAS owner/org
    owner: "nattycheck",

    // ✅ Deep link scheme
    scheme: config.scheme ?? "nattycheck",

    // ✅ App identity
    name: config.name ?? "NattyCheck",
    slug: config.slug ?? "nattycheck",

    // ✅ App icon + splash
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0B0C",
    },

    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: iosBundleId,
      buildNumber: IOS_BUILD_NUMBER,

      // Native Sign in with Apple capability (prevents web OAuth sheet)
      usesAppleSignIn: true,
    },

    android: {
      ...(config.android ?? {}),
      package: androidPackage,
    },

    extra: {
      ...(config.extra ?? {}),

      eas: {
        projectId: "72775517-8816-4db0-a8b8-f8a8938aff48",
      },

      EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_TIMEOUT_MS: process.env.EXPO_PUBLIC_TIMEOUT_MS,
    },
  };
};