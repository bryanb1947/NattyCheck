export default ({ config }) => ({
  ...config,
  extra: {
    EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  },
});
