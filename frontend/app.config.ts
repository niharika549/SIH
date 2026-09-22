import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SkillAlign",
  slug: "skillalign",
  version: "1.0.0",
  scheme: "skillalign",
  extra: {
    ...config.extra,
    backendUrl: "http://10.216.101.151:8000",
  },
});