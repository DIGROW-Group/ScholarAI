import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const Login = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Initialize particles for interactive animation
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 2 + 1,
    }));
    setParticles(newParticles);
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width * 100,
      y: (e.clientY - rect.top) / rect.height * 100,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(credentials);
    
    if (!result.success) {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Interactive Innovation Illustration */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-sky-600 relative overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        onMouseMove={handleMouseMove}
      >
        {/* Enhanced Interactive Background */}
        <div className="absolute inset-0">
          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-warm-100/90 via-primary-300/70 to-secondary-600/90"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-secondary-500/40 via-transparent to-warm-200/50"></div>
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-primary-400/30 to-secondary-800/60"></div>
          
          {/* Innovation Illustration - Central Brain/Circuit */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 1, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Central AI Brain */}
            <motion.div 
              className="relative w-48 h-48"
              animate={{
                x: mousePosition.x / 20,
                y: mousePosition.y / 20,
              }}
              transition={{ duration: 1.5 }}
            >
              {/* Brain outline */}
              <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 200 200">
                <defs>
                  <filter id="brainGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <motion.path
                  d="M100,20 C140,20 170,50 170,90 C170,110 160,130 150,140 C160,150 170,170 150,180 C130,190 110,185 100,180 C90,185 70,190 50,180 C30,170 40,150 50,140 C40,130 30,110 30,90 C30,50 60,20 100,20 Z"
                  fill="rgba(255,255,255,0.1)"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="3"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                  filter="url(#brainGlow)"
                  animate={{ strokeDashoffset: [300, 0, 300] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                
                {/* Neural pathways */}
                <motion.path
                  d="M60,80 Q100,60 140,80 M60,100 Q100,120 140,100 M70,120 Q100,100 130,120"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  filter="url(#brainGlow)"
                  animate={{ strokeDashoffset: [0, -10] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </svg>
              
              {/* Pulsing core */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 50%, rgba(251,191,36,0.6) 100%)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(251,191,36,0.4)"
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.9, 0.6, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Orbiting Data Nodes */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`orbit-${i}`}
              className="absolute w-5 h-5 rounded-full border-2 border-white/80"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
                background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(251,191,36,0.7) 100%)",
                boxShadow: "0 0 12px rgba(255,255,255,0.6), inset 0 0 8px rgba(251,191,36,0.3)"
              }}
              animate={{
                rotate: 360,
                x: Math.cos((i * 45 * Math.PI) / 180) * (120 + Math.sin(Date.now() / 1000) * 20),
                y: Math.sin((i * 45 * Math.PI) / 180) * (120 + Math.cos(Date.now() / 1000) * 20),
              }}
              transition={{
                rotate: { duration: 8 + i, repeat: Infinity, ease: "linear" },
                x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
            />
          ))}

          {/* Floating Tech Icons */}
          <motion.div
            className="absolute top-20 left-16 w-14 h-14 border-2 border-white/70 rounded-lg flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.15)",
              boxShadow: "0 0 20px rgba(255,255,255,0.3)"
            }}
            animate={{ 
              rotate: [0, 360],
              y: [-10, 10, -10],
              x: mousePosition.x / 15,
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 2 }
            }}
          >
            <div className="w-7 h-7 bg-white/80 rounded transform rotate-45 shadow-lg"></div>
          </motion.div>
          
          <motion.div
            className="absolute top-1/4 right-12 w-18 h-18 border-2 border-white/60 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.2)",
              boxShadow: "0 0 25px rgba(255,255,255,0.4)"
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, -360],
              x: -mousePosition.x / 12,
              y: mousePosition.y / 15,
            }}
            transition={{ 
              scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 15, repeat: Infinity, ease: "linear" },
              x: { duration: 2 },
              y: { duration: 2 }
            }}
          >
            <svg className="w-10 h-10" fill="rgba(255,255,255,0.9)" viewBox="0 0 24 24">
              <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
            </svg>
          </motion.div>

          <motion.div
            className="absolute bottom-24 left-1/4 w-16 h-16 backdrop-blur-sm rounded-lg flex items-center justify-center border-2 border-white/50"
            style={{
              background: "rgba(255,255,255,0.25)",
              boxShadow: "0 0 20px rgba(255,255,255,0.3)"
            }}
            animate={{ 
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
              x: mousePosition.x / 10,
              y: -mousePosition.y / 12,
            }}
            transition={{ 
              rotate: { duration: 12, repeat: Infinity, ease: "linear" },
              scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 2 },
              y: { duration: 2 }
            }}
          >
            <svg className="w-8 h-8" fill="rgba(255,255,255,0.9)" viewBox="0 0 24 24">
              <path d="M9.5 2C8.67 2 8 2.67 8 3.5V5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5H16V3.5C16 2.67 15.33 2 14.5 2H9.5M9.5 4H14.5C14.78 4 15 4.22 15 4.5V5H9V4.5C9 4.22 9.22 4 9.5 4Z"/>
            </svg>
          </motion.div>

          {/* Enhanced Neural Network */}
          <svg className="absolute inset-0 w-full h-full opacity-50">
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
                <stop offset="50%" stopColor="rgba(251,191,36,0.8)"/>
                <stop offset="100%" stopColor="rgba(249,115,22,0.6)"/>
              </linearGradient>
              <filter id="connectionGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <motion.path
              d="M50,150 Q200,50 350,200 Q500,350 650,150"
              stroke="url(#connectionGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,4"
              filter="url(#connectionGlow)"
              animate={{ strokeDashoffset: [0, -12] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M100,300 Q300,150 500,400 Q700,200 900,350"
              stroke="url(#connectionGradient)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6,3"
              filter="url(#connectionGlow)"
              animate={{ strokeDashoffset: [0, -9] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M150,100 Q400,300 650,100 Q800,250 950,150"
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4,2"
              filter="url(#connectionGlow)"
              animate={{ strokeDashoffset: [0, -6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {/* Interactive particles with enhanced behavior */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full backdrop-blur-sm"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                background: `radial-gradient(circle, rgba(255,255,255,${0.3 + particle.size / 10}) 0%, rgba(251,191,36,${0.2 + particle.size / 15}) 50%, rgba(249,115,22,${0.1 + particle.size / 20}) 100%)`,
              }}
              animate={{
                x: [0, Math.sin(mousePosition.x / 8 + particle.id) * 30, 0],
                y: [0, Math.cos(mousePosition.y / 8 + particle.id) * 25, 0],
                scale: [1, 1.4, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 4 + particle.speed,
                repeat: Infinity,
                ease: "easeInOut",
                delay: particle.id * 0.2,
              }}
            />
          ))}

          {/* Data Flow Lines */}
          <motion.div
            className="absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full"
            style={{
              boxShadow: "0 0 10px rgba(255,255,255,0.5)"
            }}
            animate={{
              scaleX: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 2,
            }}
          />
          
          <motion.div
            className="absolute bottom-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-warm-200/80 to-transparent rounded-full"
            style={{
              boxShadow: "0 0 12px rgba(251,191,36,0.4)"
            }}
            animate={{
              scaleX: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
              repeatDelay: 2,
            }}
          />
          
          <motion.div
            className="absolute top-2/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-secondary-300/70 to-transparent rounded-full"
            style={{
              boxShadow: "0 0 8px rgba(249,115,22,0.3)"
            }}
            animate={{
              scaleX: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
              repeatDelay: 3,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >

            
            {/* Compelling Slogan */}
            <motion.h1 
              className="text-5xl font-bold mb-6 leading-tight"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.span
                className="block"
                animate={{ 
                  textShadow: [
                    "0 0 20px rgba(255,255,255,0.5)",
                    "0 0 30px rgba(251,191,36,0.8)",
                    "0 0 20px rgba(255,255,255,0.5)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Unleash the Power of
              </motion.span>
              <motion.span 
                className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-warm-200 to-primary-300"
                style={{
                  backgroundSize: "200% 200%",
                }}
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                Intelligent AI
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-white/90 mb-8 leading-relaxed"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <motion.span
                animate={{
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                Transform your business with cutting-edge AI agents that 
              </motion.span>
              <motion.span 
                className="font-semibold text-warm-100"
                animate={{
                  textShadow: [
                    "0 0 10px rgba(251,191,36,0.3)",
                    "0 0 20px rgba(251,191,36,0.6)",
                    "0 0 10px rgba(251,191,36,0.3)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {" "}think, learn, and deliver extraordinary results.
              </motion.span>
            </motion.p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-sky-300" />
                <span>Automated document processing</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-sky-300" />
                <span>Intelligent data extraction</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-sky-300" />
                <span>Professional financial reports</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-md w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Access your AI-powered workspace
            </p>
          </motion.div>

          <motion.form 
            className="space-y-6"
            onSubmit={handleSubmit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="space-y-4">
              <div>
                <motion.input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  placeholder="Email"
                  value={credentials.email}
                  onChange={handleChange}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <div className="relative">
                  <motion.input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    placeholder="Password"
                    value={credentials.password}
                    onChange={handleChange}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span className="flex items-center">
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              )}
            </motion.button>


          </motion.form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
