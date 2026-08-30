// Application Configuration
export const APP_CONFIG = {
  name: "ScholarAI",
  backgroundImage: "/scholar_background.png",
  logoImage: "/scholar_logo.png",
  theme: "minimal-pro",
};

// Get current configuration
export const getConfig = () => {
  // Debug log to verify config is being read correctly
  console.log('getConfig() - Logo image path:', APP_CONFIG.logoImage);
  console.log('getConfig() - Background image path:', APP_CONFIG.backgroundImage);
  console.log('getConfig() - Active config:', APP_CONFIG);
  return APP_CONFIG;
};

