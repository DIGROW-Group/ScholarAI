/**
 * Utility functions for API operations
 */

import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Creates a FormData object from an array of files
 * @param {File[]} files - Array of File objects to append
 * @param {Object} additionalData - Optional additional data to append to FormData
 * @returns {FormData} - FormData object ready for upload
 */
export const createFormDataFromFiles = (files, additionalData = {}) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Append any additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  
  return formData;
};

/**
 * Handles axios errors consistently with appropriate toast messages
 * @param {Error} error - The axios error object
 * @param {Object} options - Error handling options
 * @param {string} options.defaultMessage - Default error message if no specific error found
 * @param {Function} options.onError - Optional callback function to execute on error
 * @returns {string} - The error message that was displayed
 */
export const handleApiError = (error, options = {}) => {
  const { defaultMessage = 'An error occurred', onError } = options;
  let errorMessage = defaultMessage;
  
  console.error('API Error:', error);
  
  // Handle network errors
  if (error.code === 'ERR_NETWORK') {
    errorMessage = 'Network error: Unable to reach the server. Please check your connection and try again.';
  } else if (error.code === 'ECONNABORTED') {
    errorMessage = 'Request timed out. Please try again.';
  } else if (error.response?.status === 500) {
    errorMessage = 'Server error: The operation failed. Please try again later.';
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  toast.error(errorMessage);
  
  if (onError && typeof onError === 'function') {
    onError(error, errorMessage);
  }
  
  return errorMessage;
};

/**
 * Executes an async operation with loading state management
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options - Options for the operation
 * @param {Function} options.setLoading - Function to set loading state
 * @param {Function} options.onSuccess - Optional callback on success
 * @param {Function} options.onError - Optional callback on error (in addition to default error handling)
 * @param {string} options.errorMessage - Custom error message
 * @returns {Promise} - Promise that resolves/rejects based on the async operation
 */
export const executeWithLoading = async (asyncFn, options = {}) => {
  const { setLoading, onSuccess, onError, errorMessage } = options;
  
  try {
    if (setLoading) {
      setLoading(true);
    }
    
    const result = await asyncFn();
    
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess(result);
    }
    
    return result;
  } catch (error) {
    handleApiError(error, {
      defaultMessage: errorMessage || 'Operation failed',
      onError
    });
    throw error;
  } finally {
    if (setLoading) {
      setLoading(false);
    }
  }
};

/**
 * Gets the axios headers for file uploads
 * @returns {Object} - Headers object for multipart/form-data
 */
export const getFileUploadHeaders = () => ({
  'Content-Type': 'multipart/form-data'
});

