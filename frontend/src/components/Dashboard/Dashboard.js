import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  CheckCircle,
  BarChart3,
  Download,
  Plus,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import { formatMoroccanDate } from '../../utils/dateUtils';
import { normalizeCompanyName } from '../../utils/companyNameUtils';
import { handleApiError, executeWithLoading } from '../../utils/apiUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProfiles: 0,
    thisMonth: 0,
    processing: 0,
    completed: 0,
    totalChangePercent: 0,
    monthChangePercent: 0,
    successRate: 0
  });
  const [chartData, setChartData] = useState({
    monthlyActivity: [],
    dailyActivity: [],
    weeklyStats: { this_week: 0, last_week: 0, change_percent: 0 }
  });
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [authLoading, user, navigate]);

  const fetchDashboardData = async () => {
    await executeWithLoading(
      async () => {
        const [statsResponse, profilesResponse, chartResponse] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/profiles?per_page=5'),
          axios.get('/api/dashboard/chart-data')
        ]);
        
        setRecentProfiles(profilesResponse.data.profiles);
        
        setStats({
          totalProfiles: statsResponse.data.total_profiles,
          thisMonth: statsResponse.data.this_month,
          processing: statsResponse.data.processing,
          completed: statsResponse.data.completed,
          totalChangePercent: statsResponse.data.total_change_percent,
          monthChangePercent: statsResponse.data.month_change_percent,
          successRate: statsResponse.data.success_rate
        });

        setChartData({
          monthlyActivity: chartResponse.data.monthly_activity || [],
          dailyActivity: chartResponse.data.daily_activity || [],
          weeklyStats: chartResponse.data.weekly_stats || { this_week: 0, last_week: 0, change_percent: 0 }
        });
      },
      {
        setLoading,
        errorMessage: 'Failed to fetch dashboard data'
      }
    );
  };

  const handleProfileClick = (profile) => {
    const hasKPIsReadyForReview = profile?.profile_data?.processing_stage === 'kpis_extracted';
    
    if (hasKPIsReadyForReview) {
      navigate(`/profiles/${profile.id}/review-kpis`);
    } else if (profile.status === 'completed') {
      try {
        const reportUrl = `/api/profiles/${profile.id}/report`;
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Error opening report:', error);
      }
    }
  };

  const statCards = [
    {
      title: 'Total Profiles',
      value: stats.totalProfiles,
      icon: FileText,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10',
      iconBg: 'bg-violet-500/20',
      change: stats.totalChangePercent,
      changeLabel: 'vs last month'
    },
    {
      title: 'This Month',
      value: stats.thisMonth,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-500/10 to-teal-600/10',
      iconBg: 'bg-emerald-500/20',
      change: stats.monthChangePercent,
      changeLabel: 'vs last month'
    },
    {
      title: 'In Progress',
      value: stats.processing,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10',
      iconBg: 'bg-amber-500/20',
      change: null,
      changeLabel: 'active now'
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-sm font-medium text-gray-300">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-lg font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-sky-500 p-8 md:p-10"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium mb-4"
              >
                <Activity className="w-4 h-4 mr-2" />
                Dashboard Overview
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-white/80 text-lg max-w-lg">
                Your company analysis platform is ready. Create new profiles and gain valuable insights.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 md:mt-0"
            >
              <Link 
                to="/profiles/new"
                className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Profile
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.change >= 0;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm border border-white/50 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.change !== null ? (
                        <>
                          <span className={`inline-flex items-center text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                            {Math.abs(stat.change)}%
                          </span>
                          <span className="text-xs text-gray-500 ml-2">{stat.changeLabel}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">{stat.changeLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-xl`}>
                    <Icon className={`h-6 w-6 bg-gradient-to-r ${stat.gradient} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text' }} />
                  </div>
                </div>
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-[0.03] pointer-events-none`} />
              </motion.div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Monthly Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Profile Activity</h2>
                <p className="text-sm text-gray-500">Monthly overview of created profiles</p>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2" />
                  <span className="text-gray-600">Total</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                  <span className="text-gray-600">Completed</span>
                </div>
              </div>
            </div>
            
            {chartData.monthlyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData.monthlyActivity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfiles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="profiles" 
                    name="Profiles"
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfiles)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    name="Completed"
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No activity data yet</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* System Status and Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            {/* System Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">API Status</span>
                  <span className="flex items-center text-emerald-600 text-sm font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">OCR Service</span>
                  <span className="flex items-center text-emerald-600 text-sm font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                    Ready
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">LLM Engine</span>
                  <span className="flex items-center text-emerald-600 text-sm font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link 
                  to="/profiles/new"
                  className="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="p-2 bg-white/20 rounded-lg mr-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">New Analysis</p>
                    <p className="text-sm text-white/80">Start a new company profile</p>
                  </div>
                </Link>
                
                <Link 
                  to="/profiles"
                  className="flex items-center p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all duration-300"
                >
                  <div className="p-2 bg-gray-200 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">View Reports</p>
                    <p className="text-sm text-gray-500">Browse all profiles</p>
                  </div>
                </Link>
                
                <button className="w-full flex items-center p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all duration-300">
                  <div className="p-2 bg-gray-200 rounded-lg mr-3">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Export Data</p>
                    <p className="text-sm text-gray-500">Download as CSV</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Profiles and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Profiles */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent Profiles</h2>
                <p className="text-sm text-gray-500">Your latest company analyses</p>
              </div>
              <Link 
                to="/profiles"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
              >
                View all
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            {recentProfiles.length > 0 ? (
              <div className="space-y-3">
                {recentProfiles.map((profile, index) => {
                  const hasKPIsReadyForReview = profile?.profile_data?.processing_stage === 'kpis_extracted';
                  const isClickable = hasKPIsReadyForReview || profile.status === 'completed';
                  
                  const statusColors = {
                    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    processing: 'bg-amber-50 text-amber-700 border-amber-200',
                    failed: 'bg-red-50 text-red-700 border-red-200',
                    pending: 'bg-gray-50 text-gray-700 border-gray-200'
                  };
                  
                  return (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => handleProfileClick(profile)}
                      className={`group flex items-center justify-between p-4 rounded-xl border border-gray-100 transition-all duration-300 ${
                        isClickable 
                          ? 'cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 hover:border-indigo-200 hover:shadow-md' 
                          : 'cursor-default hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          {profile.status === 'processing' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {normalizeCompanyName(profile.company_name)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatMoroccanDate(profile.created_at).date}
                            {isClickable && (
                              <span className="ml-2 text-indigo-600">
                                • {hasKPIsReadyForReview ? 'Review KPIs' : 'View report'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[profile.status] || statusColors.pending}`}>
                          {profile.status === 'processing' && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse" />
                          )}
                          {profile.status}
                        </span>
                        {isClickable && (
                          <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium mb-2">No profiles yet</h3>
                <p className="text-gray-500 text-sm mb-4">Create your first company profile to get started</p>
                <Link 
                  to="/profiles/new"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </Link>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
