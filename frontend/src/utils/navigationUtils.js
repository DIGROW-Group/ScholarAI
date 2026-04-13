/**
 * Utility functions for navigation operations
 */

/**
 * Creates a navigation state object with consistent structure
 * @param {Object} options - Navigation state options
 * @param {boolean} options.refreshNeeded - Whether a refresh is needed after navigation
 * @param {string} options.message - Optional message to display
 * @param {string|number} options.newProfileId - Optional new profile ID
 * @param {boolean} options.showKPINotification - Whether to show KPI notification
 * @returns {Object} - Navigation state object
 */
export const createNavigationState = (options = {}) => {
  const {
    refreshNeeded = false,
    message = null,
    newProfileId = null,
    showKPINotification = false
  } = options;
  
  const state = {};
  
  if (refreshNeeded) {
    state.refreshNeeded = true;
  }
  
  if (message) {
    state.message = message;
  }
  
  if (newProfileId) {
    state.newProfileId = newProfileId;
  }
  
  if (showKPINotification) {
    state.showKPINotification = true;
  }
  
  return state;
};

/**
 * Navigates to a route with consistent state structure
 * @param {Function} navigate - React Router navigate function
 * @param {string} path - Path to navigate to
 * @param {Object} options - Navigation state options (same as createNavigationState)
 * @param {number} delay - Optional delay in milliseconds before navigation
 */
export const navigateWithState = (navigate, path, options = {}, delay = 0) => {
  const state = createNavigationState(options);
  
  const performNavigation = () => {
    navigate(path, { state });
  };
  
  if (delay > 0) {
    setTimeout(performNavigation, delay);
  } else {
    performNavigation();
  }
};

