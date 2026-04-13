import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Play,
  AlertCircle,
  CheckCircle,
  Edit3,
  Eye,
  EyeOff,
  Calculator,
  TrendingUp,
  Building,
  FileText,
  X,
  RefreshCw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../UI/LoadingSpinner';
import { normalizeCompanyName } from '../../utils/companyNameUtils';

const KPIReview = () => {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [profileData, setProfileData] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [editingCells, setEditingCells] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  
  // Company name editing state
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [editedCompanyName, setEditedCompanyName] = useState('');
  
  // Bizafrix URL extraction state (for placeholder company name)
  const [bizafrixUrlForExtraction, setBizafrixUrlForExtraction] = useState('');
  const [extractingCompanyName, setExtractingCompanyName] = useState(false);
  
  // Web data editing state
  const [webData, setWebData] = useState(null);
  const [originalBizafrixUrl, setOriginalBizafrixUrl] = useState('');
  const [originalCharikaUrl, setOriginalCharikaUrl] = useState('');
  const [editingWebData, setEditingWebData] = useState({
    primary_sector: false,
    address: false,
    website: false,
    legal_form: false,
    bizafrix_url: false,
    charika_url: false
  });
  const [editedWebData, setEditedWebData] = useState({
    primary_sector: '',
    address: '',
    website: '',
    legal_form: '',
    bizafrix_url: '',
    charika_url: ''
  });
  
  // Filter and display options
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEmptyRows, setShowEmptyRows] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = useMemo(() => {
    const cats = [...new Set(kpis.map(kpi => kpi.category))];
    
    // Define the specific order for categories
    const categoryOrder = ['Bilan Actif', 'Bilan Passif', 'CPC', 'Crédit-bail'];
    
    // Sort categories according to the defined order
    return cats.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      
      // If both categories are in the order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the order list, sort alphabetically
      return a.localeCompare(b);
    });
  }, [kpis]);

  const filteredKpis = useMemo(() => {
    let filtered = kpis;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(kpi => kpi.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(kpi => 
        kpi.display_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter empty rows if needed
    if (!showEmptyRows) {
      filtered = filtered.filter(kpi => 
        kpi.n_value !== null || kpi.n_minus_1_value !== null
      );
    }
    
    // Sort by category order
    const categoryOrder = ['Bilan Actif', 'Bilan Passif', 'CPC', 'Crédit-bail'];
    filtered.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      
      // If both categories are in the order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the order list, sort alphabetically
      return a.category.localeCompare(b.category);
    });
    
    return filtered;
  }, [kpis, selectedCategory, searchTerm, showEmptyRows]);

  const fetchKPIs = async (retryCount = 0, maxRetries = 5) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/profiles/${profileId}/kpis`);
      
      if (response.data.success) {
        setProfileData({
          company_name: response.data.company_name,
          fiscal_years: response.data.fiscal_years,
          processing_stage: response.data.processing_stage
        });
        setEditedCompanyName(response.data.company_name);
        setKpis(response.data.kpis);
        
        // Set web data for validation
        if (response.data.web_data) {
          const basic_info = response.data.web_data.basic_info || {};
          setWebData(response.data.web_data);
          setOriginalBizafrixUrl(basic_info.bizafrix_url || '');
          setOriginalCharikaUrl(basic_info.charika_url || '');
          setEditedWebData({
            primary_sector: basic_info.primary_sector || '',
            address: basic_info.contact?.address || '',
            website: basic_info.contact?.website || '',
            legal_form: basic_info.legal_form || '',
            bizafrix_url: basic_info.bizafrix_url || '',
            charika_url: basic_info.charika_url || ''
          });
        }
      } else {
        toast.error(response.data.error || 'Failed to fetch KPIs');
        navigate('/profiles');
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      
      if (error.response?.status === 400) {
        const stage = error.response.data.processing_stage;
        const status = error.response.data.status;
        
        // If still processing and we haven't exceeded retries, wait and try again
        if (stage !== 'failed' && status !== 'failed' && retryCount < maxRetries) {
          console.log(`KPIs not ready yet (attempt ${retryCount + 1}/${maxRetries}), retrying in 3 seconds...`);
          toast.loading('KPIs are still being processed, please wait...', { duration: 2000 });
          
          setTimeout(() => {
            fetchKPIs(retryCount + 1, maxRetries);
          }, 3000);
          return;
        }
        
        toast.error(error.response.data.error || 'KPIs not ready for review');
        navigate('/profiles');
      } else {
        toast.error('Failed to load KPIs for review');
        navigate('/profiles');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchKPIs();
    }
  }, [profileId]);

  const handleCellEdit = (kpiIndex, field, value) => {
    const updatedKpis = [...kpis];
    updatedKpis[kpiIndex][field] = value === '' ? null : parseFloat(value) || value;
    setKpis(updatedKpis);
    setHasChanges(true);
  };

  const toggleCellEdit = (kpiIndex, field) => {
    const cellId = `${kpiIndex}-${field}`;
    const newEditingCells = new Set(editingCells);
    
    if (newEditingCells.has(cellId)) {
      newEditingCells.delete(cellId);
    } else {
      newEditingCells.add(cellId);
    }
    
    setEditingCells(newEditingCells);
  };

  // Company name editing functions
  const handleCompanyNameEdit = () => {
    setIsEditingCompanyName(true);
  };

  const handleCompanyNameSave = () => {
    if (editedCompanyName.trim() !== profileData.company_name) {
      setHasChanges(true);
      // Update the profileData to reflect the new company name
      setProfileData(prev => ({
        ...prev,
        company_name: editedCompanyName.trim()
      }));
    }
    setIsEditingCompanyName(false);
  };

  const handleCompanyNameCancel = () => {
    setEditedCompanyName(profileData.company_name);
    setIsEditingCompanyName(false);
  };

  // Extract company name from Bizafrix URL when company name is placeholder
  const extractCompanyNameFromBizafrix = async () => {
    if (!bizafrixUrlForExtraction.trim()) {
      toast.error('Please enter a Bizafrix URL');
      return;
    }
    
    try {
      setExtractingCompanyName(true);
      const response = await axios.post('/api/extract-company-name-from-bizafrix', {
        bizafrix_url: bizafrixUrlForExtraction.trim()
      });
      
      if (response.data.success && response.data.company_name) {
        const extractedName = response.data.company_name;
        
        // Update the company name in the profile
        const updateResponse = await axios.put(`/api/profiles/${profileId}`, {
          company_name: extractedName
        });
        
        if (updateResponse.data.success) {
          // Update local state
          setProfileData(prev => ({
            ...prev,
            company_name: extractedName
          }));
          setEditedCompanyName(extractedName);
          setBizafrixUrlForExtraction('');
          toast.success(`Company name extracted and updated: ${extractedName}`);
        } else {
          toast.error('Failed to update company name in profile');
        }
      } else {
        toast.error('Could not extract company name from Bizafrix URL');
      }
    } catch (error) {
      console.error('Error extracting company name:', error);
      toast.error(error.response?.data?.error || 'Failed to extract company name from Bizafrix URL');
    } finally {
      setExtractingCompanyName(false);
    }
  };

  // Web data editing functions
  const handleWebDataEdit = (field) => {
    // Get the current value from webData (or empty string if not present)
    const currentValue = webData[field] || '';
    
    // Update editedWebData with the current value
    setEditedWebData(prev => ({
      ...prev,
      [field]: currentValue
    }));
    
    // Set editing state to true
    setEditingWebData(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const handleWebDataSave = (field) => {
    // Always allow saving, even if the value is empty
    if (editedWebData[field] !== (webData[field] || '')) {
      setHasChanges(true);
      // Update the original webData to reflect the new value
      // BUT don't update the originalBizafrixUrl for bizafrix_url and charika_url fields
      // so we can still detect changes when generating the report
      if (field !== 'bizafrix_url' && field !== 'charika_url') {
        setWebData(prev => ({
          ...prev,
          [field]: editedWebData[field]
        }));
      }
    }
    setEditingWebData(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleWebDataCancel = (field) => {
    // Restore the original value from webData, defaulting to empty string for URL fields
    setEditedWebData(prev => ({
      ...prev,
      [field]: webData[field] || ''
    }));
    setEditingWebData(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleSaveKPIs = async () => {
    try {
      setSaving(true);
      
      const response = await axios.put(`/api/profiles/${profileId}/kpis`, {
        kpis: kpis,
        company_name: editedCompanyName.trim(),
        web_data: editedWebData
      });
      
      if (response.data.success) {
        setHasChanges(false);
        setEditingCells(new Set());
        
        // Update profileData with the saved company name
        setProfileData(prev => ({
          ...prev,
          company_name: editedCompanyName.trim()
        }));
        
        // Update the original URLs to the saved values
        // This prevents re-scraping when just editing other fields after already saving URL changes
        setOriginalBizafrixUrl(editedWebData.bizafrix_url || '');
        setOriginalCharikaUrl(editedWebData.charika_url || '');
      } else {
        toast.error(response.data.error || 'Failed to save KPIs');
      }
    } catch (error) {
      console.error('Error saving KPIs:', error);
      toast.error(error.response?.data?.error || 'Failed to save KPIs');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      // Check if Bizafrix or Charika URL has been modified BEFORE saving
      const modifiedBizafrixUrl = editedWebData.bizafrix_url || '';
      const modifiedCharikaUrl = editedWebData.charika_url || '';
      
      console.log('🔍 URL Comparison (before save):', {
        originalBizafrixUrl,
        modifiedBizafrixUrl,
        areBizafrixDifferent: modifiedBizafrixUrl !== originalBizafrixUrl,
        originalCharikaUrl,
        modifiedCharikaUrl,
        areCharikaDifferent: modifiedCharikaUrl !== originalCharikaUrl
      });
      
      // Save changes first if any (but DON'T update original URLs yet)
      if (hasChanges) {
        await handleSaveKPIs();
      }
      
      // Now check if we need to re-scrape based on the comparison BEFORE saving
      console.log('🔍 URL Comparison (after save):', {
        originalBizafrixUrl,
        modifiedBizafrixUrl,
        areBizafrixDifferent: modifiedBizafrixUrl !== originalBizafrixUrl,
        originalCharikaUrl,
        modifiedCharikaUrl,
        areCharikaDifferent: modifiedCharikaUrl !== originalCharikaUrl
      });
      
      // Check if Bizafrix URL was provided or changed
      // Note: We trigger re-scraping if the user provided ANY URL (even if originally empty)
      // Also check if it's different from the original
      const bizafrixUrlChanged = modifiedBizafrixUrl.trim() !== (originalBizafrixUrl || '');
      if (modifiedBizafrixUrl && modifiedBizafrixUrl.trim() && bizafrixUrlChanged) {
        console.log('Bizafrix URL changed, triggering re-scraping with:', modifiedBizafrixUrl);
        console.log('Original URL:', originalBizafrixUrl);
        console.log('Modified URL:', modifiedBizafrixUrl);
        
        const reScrapeResponse = await axios.post(`/api/profiles/${profileId}/re-scrape-bizafrix`, {
          bizafrix_url: modifiedBizafrixUrl
        });
        
        if (reScrapeResponse.data.success) {
          toast.success('Re-scraping with provided Bizafrix URL started. Report generation will begin automatically after re-scraping completes.');
          
          // Navigate back to profiles list - the backend will handle report generation automatically
          navigate('/profiles', {
            state: {
              refreshNeeded: true
            }
          });
          return;
        } else {
          toast.error(reScrapeResponse.data.error || 'Failed to start re-scraping with Bizafrix URL');
          return;
        }
      }
      
      // Check if Charika URL was provided or changed
      // Also check if it's different from the original
      const charikaUrlChanged = modifiedCharikaUrl.trim() !== (originalCharikaUrl || '');
      if (modifiedCharikaUrl && modifiedCharikaUrl.trim() && charikaUrlChanged) {
        console.log('Charika URL changed, triggering re-scraping with:', modifiedCharikaUrl);
        console.log('Original URL:', originalCharikaUrl);
        console.log('Modified URL:', modifiedCharikaUrl);
        
        const reScrapeResponse = await axios.post(`/api/profiles/${profileId}/re-scrape-charika`, {
          charika_url: modifiedCharikaUrl
        });
        
        if (reScrapeResponse.data.success) {
          toast.success('Re-scraping with provided Charika URL started. Report generation will begin automatically after re-scraping completes.');
          
          // Navigate back to profiles list - the backend will handle report generation automatically
          navigate('/profiles', {
            state: {
              refreshNeeded: true
            }
          });
          return;
        } else {
          toast.error(reScrapeResponse.data.error || 'Failed to start re-scraping with Charika URL');
          return;
        }
      }
      
      // Normal report generation if no Bizafrix URL changes
      const response = await axios.post(`/api/profiles/${profileId}/generate-report`);
      
      if (response.data.success) {
        navigate('/profiles', {
          state: {
            refreshNeeded: true
          }
        });
      } else {
        toast.error(response.data.error || 'Failed to start report generation');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value.toString();
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'CPC': return <TrendingUp className="h-4 w-4" />;
      case 'Bilan Actif': return <Building className="h-4 w-4" />;
      case 'Bilan Passif': return <Building className="h-4 w-4" />;
      case 'Crédit-bail': return <Calculator className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'CPC': 'bg-green-100 text-green-800',
      'Bilan Actif': 'bg-blue-100 text-blue-800',
      'Bilan Passif': 'bg-orange-100 text-orange-800',
      'Crédit-bail': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Loading KPIs...</h2>
          <p className="text-gray-600 mt-2">Preparing data for review</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">KPIs Not Available</h2>
          <p className="text-gray-600 mt-2">KPIs are not ready for review</p>
          <button
            onClick={() => navigate('/profiles')}
            className="btn-primary mt-4"
          >
            Back to Profiles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/profiles')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profiles
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Company Information and KPIs</h1>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">{normalizeCompanyName(profileData.company_name)}</span>
              {profileData.fiscal_years && (
                <span className="ml-2 text-sm">({profileData.fiscal_years})</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchKPIs()}
              disabled={loading}
              className="btn-secondary inline-flex items-center"
              title="Refresh KPIs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </button>
            
            <button
              onClick={handleSaveKPIs}
              disabled={!hasChanges || saving}
              className={`btn-secondary inline-flex items-center ${
                !hasChanges ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Save Changes</span>
            </button>
            
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="btn-primary inline-flex items-center"
            >
              {generating ? <LoadingSpinner size="sm" color="white" /> : <Play className="h-4 w-4" />}
              <span className="ml-2">Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verify Company ID Section */}
      {webData && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">1. Verify Company ID</h2>
            <div className="flex items-center text-sm text-gray-500">
              <Building className="h-4 w-4 mr-1" />
              Web Exploration Data
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              {profileData.company_name === 'company name placeholder' ? (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                    <p className="text-sm text-yellow-800">
                      Company name could not be extracted from the PDF. Please provide a Bizafrix URL to extract the company name.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bizafrix URL
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={bizafrixUrlForExtraction}
                        onChange={(e) => setBizafrixUrlForExtraction(e.target.value)}
                        placeholder="https://bizafrix.com/ma/company/..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            extractCompanyNameFromBizafrix();
                          }
                        }}
                      />
                      <button
                        onClick={extractCompanyNameFromBizafrix}
                        disabled={extractingCompanyName || !bizafrixUrlForExtraction.trim()}
                        className="btn-primary"
                      >
                        {extractingCompanyName ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Extracting...</span>
                          </>
                        ) : (
                          'Extract Company Name'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-sm text-gray-900">
                    {normalizeCompanyName(profileData.company_name) || 'Not extracted'}
                  </span>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-sm text-gray-900">
                  {webData.address || 'Non spécifié'}
                </span>
              </div>
            </div>

            {/* Primary Sector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secteur Principal
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-sm text-gray-900">
                  {webData.primary_sector || 'Non spécifié'}
                </span>
              </div>
            </div>

            {/* Bizafrix URL */}
            <div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Not correct? Please insert the correct Bizafrix URL</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bizafrix URL
              </label>
              <div className="flex items-center space-x-3">
                {editingWebData.bizafrix_url ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="url"
                      value={editedWebData.bizafrix_url}
                      onChange={(e) => setEditedWebData(prev => ({...prev, bizafrix_url: e.target.value}))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleWebDataSave('bizafrix_url');
                        if (e.key === 'Escape') handleWebDataCancel('bizafrix_url');
                      }}
                      className="flex-1 px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://bizafrix.com/ma/company/..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleWebDataSave('bizafrix_url')}
                      className="text-green-600 hover:text-green-800 transition-colors p-2 rounded hover:bg-green-50"
                      title="Save URL"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleWebDataCancel('bizafrix_url')}
                      className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                      title="Cancel editing"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className={`text-sm ${editedWebData.bizafrix_url !== (webData.bizafrix_url || '') ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                        {editedWebData.bizafrix_url || webData.bizafrix_url || 'Aucune URL Bizafrix trouvée'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleWebDataEdit('bizafrix_url')}
                      className="text-gray-500 hover:text-blue-600 transition-colors p-2 rounded hover:bg-gray-100"
                      title="Edit Bizafrix URL"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Charika URL */}
            <div>
              <div className="mb-2">
                <span className="text-sm text-gray-600">Not correct? Please insert the correct Charika URL</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Charika URL
              </label>
              <div className="flex items-center space-x-3">
                {editingWebData.charika_url ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="url"
                      value={editedWebData.charika_url}
                      onChange={(e) => setEditedWebData(prev => ({...prev, charika_url: e.target.value}))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleWebDataSave('charika_url');
                        if (e.key === 'Escape') handleWebDataCancel('charika_url');
                      }}
                      className="flex-1 px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.charika.ma/societe/..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleWebDataSave('charika_url')}
                      className="text-green-600 hover:text-green-800 transition-colors p-2 rounded hover:bg-green-50"
                      title="Save URL"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleWebDataCancel('charika_url')}
                      className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                      title="Cancel editing"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className={`text-sm ${editedWebData.charika_url !== (webData?.basic_info?.charika_url || webData?.charika_url || '') ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                        {editedWebData.charika_url || webData?.basic_info?.charika_url || webData?.charika_url || 'Aucune URL Charika trouvée'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleWebDataEdit('charika_url')}
                      className="text-gray-500 hover:text-blue-600 transition-colors p-2 rounded hover:bg-gray-100"
                      title="Edit Charika URL"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Extracted KPIs Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">2. Verify Extracted KPIs</h2>
        </div>
        
        <div className="mb-4">
          <span className="text-sm text-gray-600">Not correct? Modify them</span>
        </div>

        {/* Filters and Controls */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field min-w-[150px]"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search KPIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field min-w-[200px]"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showEmptyRows}
                onChange={(e) => setShowEmptyRows(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Show empty rows</span>
            </label>
            
            <div className="flex items-center text-sm text-gray-600">
              {showEmptyRows ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </div>
          </div>
        </div>
        </div>

        {/* KPI Table */}
        <div className="bg-gray-50 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KPI Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year N
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year N-1
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKpis.map((kpi, index) => {
                const originalIndex = kpis.findIndex(k => k.key === kpi.key);
                const isNEditing = editingCells.has(`${originalIndex}-n_value`);
                const isNMinus1Editing = editingCells.has(`${originalIndex}-n_minus_1_value`);
                
                return (
                  <motion.tr 
                    key={kpi.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {kpi.display_name}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCategoryIcon(kpi.category)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(kpi.category)}`}>
                          {kpi.category}
                        </span>
                      </div>
                    </td>
                    
                    {/* Year N Value */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {isNEditing ? (
                          <input
                            type="number"
                            value={kpi.n_value || ''}
                            onChange={(e) => handleCellEdit(originalIndex, 'n_value', e.target.value)}
                            onBlur={() => toggleCellEdit(originalIndex, 'n_value')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                toggleCellEdit(originalIndex, 'n_value');
                              }
                            }}
                            className="w-full text-center border-blue-500 focus:border-blue-500 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => toggleCellEdit(originalIndex, 'n_value')}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors min-h-[36px] flex items-center justify-center"
                          >
                            <span className={`text-sm ${kpi.n_value === null ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                              {kpi.n_value === null ? 'Click to add...' : formatValue(kpi.n_value)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => toggleCellEdit(originalIndex, 'n_value')}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                          title="Edit Year N"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    
                    {/* Year N-1 Value */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {isNMinus1Editing ? (
                          <input
                            type="number"
                            value={kpi.n_minus_1_value || ''}
                            onChange={(e) => handleCellEdit(originalIndex, 'n_minus_1_value', e.target.value)}
                            onBlur={() => toggleCellEdit(originalIndex, 'n_minus_1_value')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                toggleCellEdit(originalIndex, 'n_minus_1_value');
                              }
                            }}
                            className="w-full text-center border-blue-500 focus:border-blue-500 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => toggleCellEdit(originalIndex, 'n_minus_1_value')}
                            className="cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors min-h-[36px] flex items-center justify-center"
                          >
                            <span className={`text-sm ${kpi.n_minus_1_value === null ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                              {kpi.n_minus_1_value === null ? 'Click to add...' : formatValue(kpi.n_minus_1_value)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => toggleCellEdit(originalIndex, 'n_minus_1_value')}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                          title="Edit Year N-1"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total KPIs</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">With Data</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.filter(kpi => kpi.n_value !== null || kpi.n_minus_1_value !== null).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Unsaved Changes</p>
              <p className="text-2xl font-bold text-gray-900">
                {hasChanges ? 'Yes' : 'None'}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default KPIReview;
