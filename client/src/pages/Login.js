import React, { useState } from 'react';
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
import { School, AutoAwesome } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import useForm from '../hooks/useForm';

const GRADIENT_KEYFRAMES = `
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();

  React.useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const validateLogin = (values) => {
    const errors = {};
    if (!values.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!values.password) {
      errors.password = 'Password is required';
    }
    return errors;
  };

  const { values, errors, touched, handleChange, handleBlur, submit } = useForm(
    { email: '', password: '' },
    validateLogin
  );
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorDetails([]);
    setLoading(true);

    const submitted = await submit(async (formValues) => {
      setLoading(true);
      try {
        const result = await login(formValues.email, formValues.password);
        if (result.success) {
          navigate('/');
        } else {
          if (result.status === 429) {
            setError('Trop de tentatives échouées. Veuillez patienter avant de réessayer.');
          } else if (result.status === 401 || (result.error && (result.error.includes('credentials') || result.error.includes('status code')))) {
            setError('Email ou mot de passe incorrect. (Mot de passe démo élève : password123)');
          } else {
            setError(result.error || 'Connexion échouée. Veuillez vérifier vos identifiants.');
          }
          if (Array.isArray(result.details)) {
            setErrorDetails(result.details);
          }
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    });

    if (!submitted) {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{GRADIENT_KEYFRAMES}</style>
      <Grid container sx={{ minHeight: '100vh' }}>
        {/* Left Column — Animated Gradient Branding */}
        <Grid
          item
          xs={false}
          md={6}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(-45deg, #3730A3, #4F46E5, #6366F1, #818CF8)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 12s ease infinite',
            color: '#fff',
            px: 6,
          }}
        >
          {/* Decorative circles */}
          <Box sx={{
            position: 'absolute', top: -80, right: -80,
            width: 320, height: 320, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -60, left: -60,
            width: 240, height: 240, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          <Box sx={{
            position: 'absolute', top: '40%', left: '15%',
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }} />

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: 3,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 4,
            }}>
              <School sx={{ fontSize: 44, color: '#fff' }} />
            </Box>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.02em' }}>
              ScholarAI
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, lineHeight: 1.6, mb: 4 }}>
              AI-Powered Tutoring Platform for Modern Schools
            </Typography>
            <Box sx={{
              display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap',
            }}>
              {['Multi-Agent AI', 'Personalized Learning', 'Real-time Analytics'].map((feat) => (
                <Box key={feat} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 2, py: 0.75, borderRadius: 2,
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(4px)',
                  fontSize: '0.8rem', fontWeight: 500,
                }}>
                  <AutoAwesome sx={{ fontSize: 14 }} />
                  {feat}
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Right Column — Login Form */}
        <Grid
          item
          xs={12}
          md={6}
          component={Paper}
          elevation={0}
          square
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.default',
            px: { xs: 3, sm: 6 },
            py: { xs: 4, sm: 6 },
          }}
        >
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            maxWidth: 400, width: '100%',
          }}>
            {/* Mobile-only logo */}
            <Box sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center', gap: 1.5, mb: 4,
            }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <School sx={{ fontSize: 26, color: '#fff' }} />
              </Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                ScholarAI
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'left', width: '100%', mb: 4 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom sx={{ letterSpacing: '-0.01em' }}>
                Welcome back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to your account to continue
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                {error}
                {errorDetails.length > 0 && (
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
                    {errorDetails.map((detail) => (
                      <Box component="li" key={detail}>{detail}</Box>
                    ))}
                  </Box>
                )}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 0.75 }}>
                Email address
              </Typography>
              <TextField
                fullWidth
                name="email"
                type="email"
                placeholder="you@school.ma"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.email && errors.email)}
                helperText={touched.email ? errors.email : ''}
                required
                autoFocus
                sx={{ mb: 2.5 }}
              />
              <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 0.75 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                name="password"
                type="password"
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.password && errors.password)}
                helperText={touched.password ? errors.password : ''}
                required
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ py: 1.5, fontSize: '0.95rem', fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link component={RouterLink} to="/register" underline="hover" fontWeight={600} color="primary.main">
                    Create account
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
