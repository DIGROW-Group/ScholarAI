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
  MenuItem,
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

export default function Register() {
  const navigate = useNavigate();
  const { user, loading: authLoading, register } = useAuth();

  React.useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const validateRegister = (values) => {
    const errors = {};
    if (!values.firstName?.trim()) errors.firstName = 'First name is required';
    if (!values.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!values.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!values.role) errors.role = 'Role is required';
    if (values.role === 'student' && !values.grade) errors.grade = 'Grade is required for students';
    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const { values, errors, touched, handleChange, handleBlur, submit } = useForm(
    {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'student',
      grade: '',
      subjects: [],
    },
    validateRegister
  );

  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorDetails([]);

    const submitted = await submit(async (formValues) => {
      setLoading(true);
      try {
        const { confirmPassword, ...userData } = formValues;
        const result = await register(userData);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.error || 'Registration failed');
          if (Array.isArray(result.details)) {
            setErrorDetails(result.details);
          }
        }
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
          md={5}
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

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
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
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
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

        {/* Right Column — Register Form */}
        <Grid
          item
          xs={12}
          md={7}
          component={Paper}
          elevation={0}
          square
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.default',
            overflowY: 'auto',
            px: { xs: 3, sm: 6 },
            py: { xs: 3, sm: 4 },
          }}
        >
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            maxWidth: 480, width: '100%',
          }}>
            {/* Mobile-only logo */}
            <Box sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center', gap: 1.5, mb: 3,
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

            <Box sx={{ textAlign: 'left', width: '100%', mb: 3 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom sx={{ letterSpacing: '-0.01em' }}>
                Create your account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Join ScholarAI and start learning smarter
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
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
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={values.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.firstName && errors.firstName)}
                    helperText={touched.firstName ? errors.firstName : ''}
                    required
                    autoFocus
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={values.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.lastName && errors.lastName)}
                    helperText={touched.lastName ? errors.lastName : ''}
                    required
                  />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                margin="normal"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.email && errors.email)}
                helperText={touched.email ? errors.email : ''}
                required
              />
              <TextField
                fullWidth
                select
                label="Role"
                name="role"
                margin="normal"
                value={values.role}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.role && errors.role)}
                helperText="Self-service registration is available for students and parents only"
                required
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="parent">Parent</MenuItem>
              </TextField>
              {values.role === 'student' && (
                <TextField
                  fullWidth
                  select
                  label="Grade"
                  name="grade"
                  margin="normal"
                  value={values.grade}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.grade && errors.grade)}
                  helperText={touched.grade ? errors.grade : 'Select your current grade level'}
                  required
                >
                  <MenuItem value="1ere College">1ère Collège</MenuItem>
                  <MenuItem value="2eme College">2ème Collège</MenuItem>
                  <MenuItem value="3eme College">3ème Collège</MenuItem>
                  <MenuItem value="Tronc Commun">Tronc Commun</MenuItem>
                  <MenuItem value="1ere Bac">1ère Bac</MenuItem>
                  <MenuItem value="2eme Bac">2ème Bac</MenuItem>
                </TextField>
              )}
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                margin="normal"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.password && errors.password)}
                helperText={touched.password ? errors.password : ''}
                required
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                margin="normal"
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                helperText={touched.confirmPassword ? errors.confirmPassword : ''}
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '0.95rem', fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" underline="hover" fontWeight={600} color="primary.main">
                    Sign in
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
