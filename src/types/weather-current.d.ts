export {};

declare global {
  const CURRENT: {
    condition: "sun" | "cloud-sun" | "cloud" | "cloud-rain" | "cloud-fog" | "cloud-drizzle";
  };
}
