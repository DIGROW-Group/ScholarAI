import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
} from '@mui/material';
import { School } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getConfig } from '../config/appConfig';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Get fresh config
  const config = getConfig();
  
  // Use state to store logo URL to force re-render when it changes
  const [logoUrl, setLogoUrl] = useState(() => {
    const url = `${config.logoImage}?v=${Date.now()}`;
    console.log('Login initial - Logo URL set to:', url, 'Config:', config);
    return url;
  });
  
  // Update logo URL when config changes
  useEffect(() => {
    const newUrl = `${config.logoImage}?v=${Date.now()}`;
    console.log('Login useEffect - Updating logo URL to:', newUrl, 'Config logo:', config.logoImage);
    setLogoUrl(newUrl);
  }, [config.logoImage, config.name]);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  console.log('Login render - Current logoUrl:', logoUrl, 'Config logo:', config.logoImage, 'Config name:', config.name);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login form submitted with:', { email: formData.email });

    try {
      const result = await login(formData.email, formData.password);
      console.log('Login result:', result);
      
      if (result.success) {
        navigate('/');
      } else {
        console.error('Login failed:', result.error);
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login exception:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      {/* Left Column - Background Image */}
      <Grid
        item
        xs={false}
        md={6}
        sx={{
          backgroundImage: `url(${config.backgroundImage})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: { xs: 'none', md: 'block' },
        }}
      />
      
      {/* Right Column - Login Form */}
      <Grid
        item
        xs={12}
        md={6}
        component={Paper}
        elevation={6}
        square
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.default',
          px: { xs: 2, sm: 4 },
          py: { xs: 4, sm: 6 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 450,
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Box sx={{ p: { xs: 1, sm: 2 }, mb: 1 }}>
              <Box
                component="img"
                src={logoUrl}
                alt={`${config.name} Logo`}
                key={`logo-${config.logoImage}-${logoUrl}`}
                sx={{
                  height: { xs: 72, sm: 90, md: 108 },
                  width: 'auto',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  console.error('Failed to load logo. Expected:', config.logoImage, 'Tried:', logoUrl);
                  console.error('Current config:', config);
                  console.error('Image element src attribute:', e.target.src);
                  e.target.style.display = 'none';
                }}
                onLoad={(e) => {
                  console.log('Logo loaded successfully!');
                  console.log('Loaded URL:', e.target.src);
                  console.log('Expected URL:', logoUrl);
                  console.log('Config logo:', config.logoImage);
                  console.log('Config name:', config.name);
                }}
              />
            </Box>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              fontWeight="bold"
              color="primary.main"
              sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.8rem' } }}
            >
              {config.name}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              {/* École Marocaine des Sciences de l'Ingénieur */}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-Powered Tutoring Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: { xs: 0, sm: 1 }, width: '100%' }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: { xs: 2, sm: 3 }, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link component={RouterLink} to="/register" underline="hover" variant="body2">
                Don't have an account? Register
              </Link>
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}

