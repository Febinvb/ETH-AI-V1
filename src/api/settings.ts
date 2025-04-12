import { SettingsData } from "./mockApi";

// Default settings data to use when live data is unavailable
const defaultSettingsData: SettingsData = {
  autoTrading: false,
  stopLossPercentage: 2,
  takeProfitPercentage: 5,
  telegramAlerts: false,
  riskLevel: "medium",
  tradingPair: "XRP/USDT",
  apiKeyConfigured: false,
  lastUpdated: new Date().toISOString(),
};

// Local settings cache to use when updating fails
let settingsCache: SettingsData = { ...defaultSettingsData };

// Fetch settings data
export async function getSettings(): Promise<SettingsData> {
  console.log("[API] Fetching settings data...");
  try {
    const response = await fetch("/api/settings");

    if (!response.ok) {
      console.log(
        `[API] Settings data fetch failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Returning cached or default settings data");
      return settingsCache;
    }

    const data = await response.json();
    console.log("[API] Settings data fetched successfully:", data);
    settingsCache = data; // Update cache with latest data
    return data;
  } catch (error) {
    console.error("Failed to fetch settings data:", error);
    console.log("[API] Returning cached or default settings data due to error");
    return settingsCache;
  }
}

// Update settings
export async function updateSettings(
  settings: Partial<SettingsData>,
): Promise<SettingsData> {
  console.log("[API] Updating settings with data:", settings);

  // Update local cache immediately for responsive UI
  settingsCache = { ...settingsCache, ...settings };

  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      console.log(
        `[API] Settings update failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Using cached settings but backend update failed");
      return settingsCache;
    }

    const data = await response.json();
    console.log("[API] Settings updated successfully:", data);
    settingsCache = data; // Update cache with confirmed data from server
    return data;
  } catch (error) {
    console.error("Failed to update settings:", error);
    console.log(
      "[API] Using cached settings but backend update failed due to error",
    );
    return settingsCache;
  }
}
