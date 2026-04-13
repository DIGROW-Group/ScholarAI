import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import FileUpload from '../UI/FileUpload';
import LoadingSpinner from '../UI/LoadingSpinner';
import CompanyNameMismatchModal from '../UI/CompanyNameMismatchModal';
import { createFormDataFromFiles, handleApiError, executeWithLoading, getFileUploadHeaders } from '../../utils/apiUtils';
import { navigateWithState } from '../../utils/navigationUtils';

const NewProfile = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(2);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fiscal_year: null,
    email_report: false
  });
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  
  // Company name mismatch modal state
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchData, setMismatchData] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  

  const steps = [
    { id: 2, name: 'Document Upload', description: 'Upload fiscal documents' },
    { id: 3, name: 'Verification', description: 'Verify profile information' }
  ];


  const validateStep2 = () => {
    return uploadedFiles.length > 0 && uploadedFiles.length <= 3;
  };

  const validateStep3 = () => {
    return verificationResult !== null;
  };

  const verifyProfile = async () => {
    if (!uploadedFiles.length) {
      toast.error('Please upload documents first');
      return;
    }

    try {
      setVerifying(true);
      // Clear any previous verification result to ensure clean state
      setVerificationResult(null);
      
      const formData = createFormDataFromFiles(uploadedFiles, {
        company_name: profileData.company_name
      });
      
      const response = await axios.post('/api/profiles/verify', formData, {
        headers: getFileUploadHeaders()
      });
      
      setVerificationResult(response.data);
      
      if (response.data.success) {
        if (response.data.extracted_info) {
          // Always use extracted information as the source of truth
          setProfileData(prev => ({
            ...prev,
            company_name: response.data.extracted_info.company_name || prev.company_name,
            fiscal_year: response.data.extracted_info.fiscal_year || prev.fiscal_year
          }));
          
          // Show success message for multiple documents
          if (response.data.extracted_info.document_count > 1) {
            // toast.success(`Successfully processed ${response.data.extracted_info.document_count} documents!`);
          }
          
          // Check for company name mismatches in individual results
          if (response.data.extracted_info.individual_results && response.data.extracted_info.individual_results.length > 1) {
            const documentCompanies = response.data.extracted_info.individual_results
              .map(result => result.company_name)
              .filter(name => name && name.trim());
            
            console.log('Document companies detected:', documentCompanies);
            
            // Check if there are different company names
            const uniqueCompanies = [...new Set(documentCompanies)];
            console.log('Unique companies:', uniqueCompanies);
            
            if (uniqueCompanies.length > 1) {
              console.log('Company name mismatch detected, showing modal');
              // Show company name mismatch modal
              setMismatchData({
                comparison_result: {
                  match: false,
                  reason: 'Different company names detected in uploaded documents',
                  requires_confirmation: true,
                  recommendation: `Documents contain different company names: ${uniqueCompanies.join(', ')}. Please confirm if you want to proceed.`,
                  document_companies: uniqueCompanies
                },
                document_companies: uniqueCompanies
              });
              setPendingFiles(uploadedFiles);
              setShowMismatchModal(true);
              setVerifying(false);
              return;
            }
          }
        }
        
        if (response.data.existing_profile) {
          setExistingProfile(response.data.existing_profile);
          toast.success('Profile already exists! You can view the existing analysis.');
        } else {
          // toast.success('Verification complete. Starting KPI extraction...');
          // Automatically proceed to create profile and extract KPIs
          await createProfile(response.data);
        }
      } else {
        setExistingProfile(null);
        toast.error(response.data.error || 'Verification failed');
      }
      
    } catch (error) {
      handleApiError(error, {
        defaultMessage: 'Failed to verify profile. Please try again.',
        onError: () => {
          // Additional error handling if needed
        }
      });
    } finally {
      setVerifying(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 2 && !validateStep2()) {
      toast.error('Please upload 1-3 fiscal documents');
      return;
    }
    if (currentStep === 2) {
      // Auto-verify when moving from step 2 to 3
      await verifyProfile();
      // Only move to step 3 after verification completes
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3 && !verificationResult) {
      // Auto-verify when clicking "Verify Profile" button in step 3
      await verifyProfile();
      return;
    }
  };

  const prevStep = () => {
    if (currentStep > 2) {
      setCurrentStep(currentStep - 1);
    }
  };

  const viewExistingProfile = () => {
    if (existingProfile) {
      // If profile is completed, open the report directly
      if (existingProfile.status === 'completed') {
        const reportUrl = `/api/profiles/${existingProfile.id}/report`;
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
      } else {
        // For non-completed profiles, navigate to profiles list
        // toast.error('Profile is still being processed. Please wait for completion.');
        navigate('/profiles');
      }
    }
  };

  const createProfile = async (verificationData = null) => {
    return executeWithLoading(
      async () => {
        // Use the extracted company name from verification result (passed as parameter or from state)
        const verificationResultData = verificationData || verificationResult;
        const extractedCompanyName = verificationResultData?.extracted_info?.company_name || 'Company Name Not Extracted';
        
        // Allow profile creation with placeholder - user can extract company name later in KPI page
        
        // Create the profile with the extracted company name
        const profileResponse = await axios.post('/api/profiles', {
          company_name: extractedCompanyName,
          fiscal_year: profileData.fiscal_year,
          email_report: profileData.email_report
        });
        const newProfileId = profileResponse.data.id;
        
        // Upload files using smart upload if any
        if (uploadedFiles.length > 0) {
          const formData = createFormDataFromFiles(uploadedFiles);
          
          try {
            // Use smart upload endpoint that only processes new documents
            const uploadResponse = await axios.post(`/api/profiles/${newProfileId}/smart-upload`, formData, {
              headers: getFileUploadHeaders()
            });
          
          // Check if company name mismatch was detected
          if (uploadResponse.data.requires_confirmation) {
            setMismatchData(uploadResponse.data);
            setPendingFiles(uploadedFiles);
            setShowMismatchModal(true);
            setLoading(false);
            return; // Don't proceed with navigation yet
          }
          
          // Show smart upload results
          if (uploadResponse.data.document_analysis) {
            const { total_new, total_existing } = uploadResponse.data.document_analysis;
            if (total_existing > 0) {
              // toast.success(`Smart upload complete! ${total_existing} document(s) reused, ${total_new} new document(s) to process.`);
            } else {
              // toast.success(`Upload complete! ${total_new} new document(s) to process.`);
            }
          }
          
          // toast.success('KPI extraction started!');
          
            // Navigate to KPI review page after polling for completion
            pollForKPIExtraction(newProfileId);
            
          } catch (uploadError) {
            handleApiError(uploadError, {
              defaultMessage: 'Failed to upload documents'
            });
            throw uploadError; // Re-throw to stop execution
          }
        } else {
          // No files to upload, just create profile
          navigateWithState(navigate, '/profiles', {
            refreshNeeded: true,
            newProfileId: newProfileId,
            message: 'Profile created successfully!'
          }, 2000);
        }
        
        return newProfileId;
      },
      {
        setLoading,
        errorMessage: 'Failed to create profile'
      }
    );
  };

  // Handle company name mismatch confirmation
  const handleMismatchConfirm = async () => {
    return executeWithLoading(
      async () => {
        // Check if this is a verification mismatch or upload mismatch
        const isVerificationMismatch = !mismatchData?.document_analysis;
        
        if (isVerificationMismatch) {
          // This is a verification mismatch - just close modal and allow user to proceed
          setShowMismatchModal(false);
          setMismatchData(null);
          setPendingFiles([]);
          
          // Show success message and allow user to continue to next step
          // toast.success('Company name mismatch acknowledged. You can proceed with profile creation.');
          return;
        }
        
        // This is an upload mismatch - create profile and upload files
        // Create the profile first
        const profileResponse = await axios.post('/api/profiles', {
          ...profileData,
          fiscal_year: profileData.fiscal_year
        });
        const newProfileId = profileResponse.data.id;
        
        // Upload files with confirmation
        const formData = createFormDataFromFiles(pendingFiles);
        
        // Determine which endpoint to use based on mismatch data
        const isSmartUpload = mismatchData?.document_analysis !== undefined;
        const endpoint = isSmartUpload ? 'confirm-smart-upload' : 'confirm-upload';
        
        const uploadResponse = await axios.post(`/api/profiles/${newProfileId}/${endpoint}`, formData, {
          headers: getFileUploadHeaders(),
          data: { action: 'proceed' }
        });
      
      // Show appropriate success message
      if (isSmartUpload) {
        if (uploadResponse.data.document_analysis) {
          const { total_new, total_existing } = uploadResponse.data.document_analysis;
          if (total_existing > 0) {
            toast.success(`Smart upload complete! ${total_existing} document(s) reused, ${total_new} new document(s) to process.`);
          } else {
            toast.success(`Upload complete! ${total_new} new document(s) to process.`);
          }
        }
      } else {
        // toast.success('Profile created and documents uploaded successfully!');
      }
      
        // Close modal and navigate
        setShowMismatchModal(false);
        setMismatchData(null);
        setPendingFiles([]);
        
        navigateWithState(navigate, '/profiles', {
          refreshNeeded: true,
          newProfileId: newProfileId,
          message: 'Profile created and is being processed...'
        }, 2000);
      },
      {
        setLoading,
        errorMessage: 'Failed to proceed with confirmation'
      }
    );
  };

  const handleMismatchCancel = () => {
    setShowMismatchModal(false);
    setMismatchData(null);
    setPendingFiles([]);
    
    // Check if this is a verification mismatch
    const isVerificationMismatch = !mismatchData?.document_analysis;
    
    if (isVerificationMismatch) {
      // toast.success('Company name mismatch acknowledged. You can still proceed with profile creation.');
      // Reset to step 1 to allow user to start over
      resetForm();
    } else {
      // toast.success('Upload cancelled due to company name mismatch');
    }
  };

  // Poll for KPI extraction completion
  const pollForKPIExtraction = async (profileId, maxAttempts = 30, interval = 5000) => {
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        attempts++;
        console.log(`Polling attempt ${attempts} for profile ${profileId}`);
        
        const response = await axios.get(`/api/profiles/${profileId}/kpis`);
        
        if (response.data.success) {
          // KPIs are ready for review - navigate directly to review page
          toast.success('KPIs extracted successfully! Ready for review.');
          navigate(`/profiles/${profileId}/review-kpis`);
          return true;
        }
      } catch (error) {
        if (error.response?.status === 400) {
          // KPIs not ready yet
          const stage = error.response.data.processing_stage;
          const status = error.response.data.status;
          console.log(`KPIs not ready, current stage: ${stage}, status: ${status}`);
          
          // Check if processing failed
          if (stage === 'failed' || status === 'failed') {
            toast.error('KPI extraction failed. Please check the profile and try again.');
            navigate('/profiles');
            return true;
          }
          
          // Navigate to profiles list - KPI extraction is running in the background
          // Message will be shown by ProfilesList component via location.state
          navigateWithState(navigate, '/profiles', {
            refreshNeeded: true,
            message: 'Profile created successfully! KPI extraction is running in the background.',
            showKPINotification: true  // Enable notification when KPIs are ready
          });
          return true;
        } else {
          // Other error
          console.error('Error checking KPI status:', error);
          navigateWithState(navigate, '/profiles', {
            refreshNeeded: true,
            message: 'Profile created, but there was an error checking KPI status.'
          });
          return true;
        }
      }
    };
    
    // Start polling
    checkStatus();
  };

  // Reset form to initial state
  const resetForm = () => {
    setCurrentStep(2);
    setUploadedFiles([]);
    setVerificationResult(null);
    setExistingProfile(null);
    setProfileData({
      fiscal_year: null,
      email_report: false
    });
  };

  // Modified createProfile function to handle company name mismatches
  const createProfileWithUpload = async (verificationData = null) => {
    return executeWithLoading(
      async () => {
        // Use the extracted company name from verification result (passed as parameter or from state)
        const verificationResultData = verificationData || verificationResult;
        const extractedCompanyName = verificationResultData?.extracted_info?.company_name || 'Company Name Not Extracted';
        
        // Allow profile creation with placeholder - user can extract company name later in KPI page
        
        // Create the profile with the extracted company name
        const profileResponse = await axios.post('/api/profiles', {
          company_name: extractedCompanyName,
          fiscal_year: profileData.fiscal_year,
          email_report: profileData.email_report
        });
        const newProfileId = profileResponse.data.id;
        
        // Upload files using regular upload endpoint
        if (uploadedFiles.length > 0) {
          const formData = createFormDataFromFiles(uploadedFiles);
          
          try {
            const uploadResponse = await axios.post(`/api/profiles/${newProfileId}/upload`, formData, {
              headers: getFileUploadHeaders()
            });
            
            // Check if company name mismatch was detected
            if (uploadResponse.data.requires_confirmation) {
              setMismatchData(uploadResponse.data);
              setPendingFiles(uploadedFiles);
              setShowMismatchModal(true);
              return; // Don't proceed with navigation yet
            }
            
            // If no mismatch, proceed normally
            navigateWithState(navigate, '/profiles', {
              refreshNeeded: true,
              newProfileId: newProfileId,
              message: 'Profile created and is being processed...'
            }, 2000);
            
          } catch (uploadError) {
            handleApiError(uploadError, {
              defaultMessage: 'Failed to upload documents'
            });
            throw uploadError; // Re-throw to stop execution
          }
        } else {
          // No files to upload, just create profile
          navigateWithState(navigate, '/profiles', {
            refreshNeeded: true,
            newProfileId: newProfileId,
            message: 'Profile created successfully!'
          }, 2000);
        }
        
        return newProfileId;
      },
      {
        setLoading,
        errorMessage: 'Failed to create profile'
      }
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Upload className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
              <p className="text-gray-600">Upload the fiscal bundle documents (liasses fiscales)</p>
            </div>

            <FileUpload
              onFilesSelected={setUploadedFiles}
              maxFiles={3}
              maxSize={16 * 1024 * 1024}  // 16MB in bytes
              acceptedTypes={['.pdf']}
            />

            {/* Remove duplicated Selected Files list. The FileUpload component already renders it. */}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Upload Guidelines</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Maximum 3 files allowed</li>
                    <li>Supported formats: PDF, JPG, PNG</li>
                    <li>Maximum file size: 16MB each</li>
                    <li>Ensure documents are clear and readable</li>
                  </ul>
                </div>
              </div>
            </div>


          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Profile Verification</h2>
              <p className="text-gray-600">Verifying document information and checking for existing profiles</p>
            </div>

            {verifying ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" color="primary" />
                <p className="text-gray-600 mt-4">Analyzing documents and checking for existing profiles...</p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-6">
                {verificationResult.success && !verificationResult.existing_profile ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Documents Ready</h3>
                    <p className="text-gray-600">No existing profile found. Ready to extract KPIs.</p>
                    {verificationResult.extracted_info?.company_name && (
                      <p className="text-gray-700 mt-2">
                        <strong>Company Name:</strong> {verificationResult.extracted_info.company_name === 'company name placeholder' 
                          ? 'Company name placeholder (will be extracted in KPI page)' 
                          : verificationResult.extracted_info.company_name}
                      </p>
                    )}
                  </div>
                ) : verificationResult.success && verificationResult.existing_profile ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Existing Profile Found</h3>
                    <p className="text-gray-600 mb-4">
                      A profile already exists for this company. Would you like to use the existing profile or create a new one?
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => viewExistingProfile()}
                        className="btn-secondary"
                      >
                        Use Existing Profile
                      </button>
                      <button
                        onClick={createProfile}
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? <LoadingSpinner size="sm" /> : 'Create New Profile'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Failed</h3>
                    <p className="text-gray-600">{verificationResult.error || 'Unable to process documents'}</p>
                  </div>
                )}

                {existingProfile ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-800 mb-2">Existing Profile Found</h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          A profile for "{existingProfile.company_name}" 
                          {existingProfile.fiscal_years && ` (${existingProfile.fiscal_years})`}{" "} 
                          already exists in the system.
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={viewExistingProfile}
                            className="btn-primary text-sm"
                          >
                            View Existing Profile
                          </button>
                          <button
                            onClick={() => createProfileWithUpload(verificationResult)}
                            disabled={loading}
                            className="btn-secondary text-sm inline-flex items-center"
                          >
                            {loading ? <LoadingSpinner size="sm" /> : 'Create New Profile Anyway'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : verificationResult.success && verificationResult.should_create_new === false ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Profile Already Complete</p>
                        <p>A comprehensive profile for this company and fiscal year range already exists.</p>
                        <div className="mt-3">
                          <button
                            onClick={() => createProfileWithUpload(verificationResult)}
                            disabled={loading}
                            className="btn-secondary text-sm inline-flex items-center"
                          >
                            {loading ? <LoadingSpinner size="sm" /> : 'Create New Profile Anyway'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : verificationResult.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Verification Complete</p>
                        <p>No existing profile found. You can proceed to create a new profile.</p>
                        {verificationResult.extracted_info?.company_name && (
                          <p className="mt-2">
                            <strong>Company Name:</strong> {verificationResult.extracted_info.company_name === 'company name placeholder' 
                              ? 'Company name placeholder (will be extracted in KPI page)' 
                              : verificationResult.extracted_info.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium mb-1">Verification Failed</p>
                        <p>{verificationResult.error || 'Unable to verify profile information'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Click "Verify Profile" to verify your profile information</p>
              </div>
            )}
          </motion.div>
        );



      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Processing Documents...</h2>
          <p className="text-gray-600 mt-2">Please wait while we process your documents and extract financial KPIs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/profiles')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profiles
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Extract KPIs</h1>
        <p className="text-gray-600 mt-2">Follow the steps to extract financial KPIs from documents</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="card min-h-[500px]">
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 2}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              disabled={verifying}
              className="btn-primary inline-flex items-center disabled:opacity-75"
            >
              {verifying ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Verifying...</span>
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          ) : currentStep === 3 && !verificationResult ? (
            <button
              onClick={nextStep}
              disabled={verifying}
              className="btn-primary inline-flex items-center disabled:opacity-75"
            >
              {verifying ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Verifying...</span>
                </>
              ) : (
                <>
                  Verify Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
      
      {/* Company Name Mismatch Modal */}
      <CompanyNameMismatchModal
        isOpen={showMismatchModal}
        onClose={() => setShowMismatchModal(false)}
        onConfirm={handleMismatchConfirm}
        onCancel={handleMismatchCancel}
        comparisonResult={mismatchData?.comparison_result}
        profileCompany={profileData.company_name}
        documentCompanies={mismatchData?.document_companies || []}
        isVerificationMismatch={!mismatchData?.document_analysis}
      />
    </div>
  );
};

export default NewProfile;
