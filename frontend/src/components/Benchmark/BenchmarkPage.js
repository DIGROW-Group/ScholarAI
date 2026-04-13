import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import axios from 'axios';
import { normalizeCompanyName } from '../../utils/companyNameUtils';

const BenchmarkPage = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 [BENCHMARK] Component mounted, user:', user ? 'Present' : 'Missing');
    if (user) {
      fetchProfiles();
      fetchAvailableServices();
      fetchAvailableModels();
    } else {
      console.log('❌ [BENCHMARK] No user available, skipping API calls');
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      setError(null);
      console.log('🔍 [BENCHMARK] Fetching profiles...');
      console.log('🔍 [BENCHMARK] Using axios with automatic auth headers');
      
      const response = await axios.get('/api/benchmark/profiles');
      
      console.log('🔍 [BENCHMARK] Response status:', response.status);
      console.log('✅ [BENCHMARK] Profiles data received:', response.data);
      console.log('✅ [BENCHMARK] Number of profiles:', response.data.profiles?.length || 0);
      setProfiles(response.data.profiles || []);
    } catch (err) {
      console.error('❌ [BENCHMARK] Error fetching profiles:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setProfilesLoading(false);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const response = await axios.get('/api/benchmark/services');
      setAvailableServices(response.data.services);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      setModelsLoading(true);
      const response = await axios.get('/api/benchmark/models');
      console.log('🔍 [BENCHMARK] Available models response:', response.data);
      console.log('🔍 [BENCHMARK] Service keys:', Object.keys(response.data.models));
      setAvailableModels(response.data.models);
      
      // Set default models for each service
      const defaultModels = {};
      Object.keys(response.data.models).forEach(service => {
        const models = response.data.models[service];
        const firstModel = Object.keys(models)[0];
        if (firstModel) {
          defaultModels[service] = firstModel;
        }
      });
      setSelectedModels(defaultModels);
    } catch (err) {
      console.error('Error fetching models:', err);
    } finally {
      setModelsLoading(false);
    }
  };

  const generateBenchmarkAnalysis = async (profileId) => {
    setLoading(true);
    setError(null);
    setBenchmarkResults(null);

    try {
      const response = await axios.post(`/api/benchmark/profiles/${profileId}/analyze`, {
        fiscal_year: selectedProfile?.fiscal_years,
        selected_models: selectedModels
      });

      setBenchmarkResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setBenchmarkResults(null);
  };

  const handleModelSelect = (service, modelId) => {
    setSelectedModels(prev => ({
      ...prev,
      [service]: modelId
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderSWOTAnalysis = (swotData, serviceName) => {
    if (!swotData || Object.keys(swotData).length === 0) {
      return <p className="text-gray-500 italic">Aucune analyse SWOT disponible</p>;
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Forces</h4>
            <ul className="text-sm text-green-700 space-y-1">
              {swotData.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Faiblesses</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {swotData.weaknesses?.map((weakness, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Opportunités</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {swotData.opportunities?.map((opportunity, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">Menaces</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              {swotData.threats?.map((threat, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  {threat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendation = (recommendation, serviceName) => {
    if (!recommendation) {
      return <p className="text-gray-500 italic">Aucune recommandation disponible</p>;
    }

    return (
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-semibold text-purple-800 mb-2">Recommandation Stratégique</h4>
        <p className="text-sm text-purple-700 leading-relaxed">{recommendation}</p>
      </div>
    );
  };

  const renderDetailedAnalysis = (analysis, serviceName) => {
    if (!analysis) {
      return <p className="text-gray-500 italic">Aucune analyse détaillée disponible</p>;
    }

    return (
      <div className="bg-indigo-50 p-4 rounded-lg">
        <h4 className="font-semibold text-indigo-800 mb-2">Analyse Détaillée</h4>
        <p className="text-sm text-indigo-700 leading-relaxed">{analysis}</p>
      </div>
    );
  };

  // Show loading or error if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">LLM Models Benchmark</h1>
            <p className="text-gray-600">
              Compare analyses generated by different AI models to evaluate their performance
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Authentication Required</p>
            <p className="text-sm">Please log in to access the benchmark feature.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LLM Models Benchmark</h1>
          <p className="text-gray-600">
            Compare analyses generated by different AI models to evaluate their performance
          </p>
        </div>

        {/* Profile Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select a Profile</h2>
            <button
              onClick={() => {
                console.log('🔄 [BENCHMARK] Manual refresh triggered');
                fetchProfiles();
              }}
              disabled={profilesLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              {profilesLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Error loading profiles:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {profilesLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600">Loading profiles...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No completed profiles found.</p>
              <p className="text-sm text-gray-400">Complete a profile first to use the benchmark feature.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProfile?.id === profile.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleProfileSelect(profile)}
              >
                <h3 className="font-medium text-gray-900">{normalizeCompanyName(profile.company_name)}</h3>
                <p className="text-sm text-gray-500">Fiscal Years: {profile.fiscal_years || 'N/A'}</p>
                <p className="text-xs text-gray-400">Created: {formatDate(profile.created_at)}</p>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Model Selection */}
        {selectedProfile && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Select Models</h2>
              <button
                onClick={fetchAvailableModels}
                disabled={modelsLoading}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            
            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-gray-600">Loading available models...</span>
              </div>
            ) : Object.keys(availableModels).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(availableModels).map(([service, models]) => (
                <div key={service} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">
                    {(() => {
                      console.log('🔍 [BENCHMARK] Rendering service:', service);
                      if (service === 'anthropic') return 'Anthropic Claude';
                      if (service === 'google') return 'Google Gemini';
                      return 'OpenAI ChatGPT';
                    })()}
                  </h3>
                  <select
                    value={selectedModels[service] || ''}
                    onChange={(e) => handleModelSelect(service, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(models).map(([modelId, modelInfo]) => (
                      <option key={modelId} value={modelId}>
                        {modelInfo.name} - {modelInfo.description}
                      </option>
                    ))}
                  </select>
                  {selectedModels[service] && (
                    <div className="text-sm text-gray-600">
                      <p><strong>Model:</strong> {models[selectedModels[service]]?.name}</p>
                      <p><strong>Description:</strong> {models[selectedModels[service]]?.description}</p>
                      <p><strong>Cost Tier:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                          models[selectedModels[service]]?.cost_tier === 'premium' ? 'bg-red-100 text-red-800' :
                          models[selectedModels[service]]?.cost_tier === 'standard' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {models[selectedModels[service]]?.cost_tier}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No models available. Please check your API keys.</p>
              </div>
            )}
          </div>
        )}

        {/* Analysis Generation */}
        {selectedProfile && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Analysis for {selectedProfile.company_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Available services: {availableServices.join(', ')}
                </p>
              </div>
              <button
                onClick={() => generateBenchmarkAnalysis(selectedProfile.id)}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Generating...</span>
                  </>
                ) : (
                  'Generate Analysis'
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Benchmark Results */}
        {benchmarkResults && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Benchmark Results</h2>
            
            {Object.entries(benchmarkResults.results).map(([serviceName, result]) => (
              <div key={serviceName} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                      {serviceName === 'anthropic' ? 'Anthropic Claude' : 'OpenAI ChatGPT'}
                    </h3>
                    {result.model_name && (
                      <p className="text-sm text-gray-600 mt-1">
                        Model: <span className="font-medium">{result.model_name}</span>
                        {result.model_id && (
                          <span className="text-gray-400 ml-2">({result.model_id})</span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    result.status === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.status === 'success' ? 'Success' : 'Error'}
                  </span>
                </div>

                {result.status === 'error' ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p className="font-medium">Error during generation:</p>
                    <p className="text-sm mt-1">{result.error}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* SWOT Analysis */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">SWOT Analysis</h4>
                      {renderSWOTAnalysis(result.swot_analysis, serviceName)}
                    </div>

                    {/* Recommendation */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Recommendation</h4>
                      {renderRecommendation(result.recommendation, serviceName)}
                    </div>

                    {/* Detailed Analysis */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Detailed Analysis</h4>
                      {renderDetailedAnalysis(result.detailed_analysis, serviceName)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarkPage;
