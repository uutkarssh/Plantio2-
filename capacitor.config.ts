import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

if (!serverUrl) {
  throw new Error(
    "CAPACITOR_SERVER_URL is required when building the Plantio Android app."
  );
}

const config: CapacitorConfig = {
  appId: "com.plantio.app",
  appName: "Plantio",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
