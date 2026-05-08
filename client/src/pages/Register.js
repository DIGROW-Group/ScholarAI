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
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getConfig } from '../config/appConfig';
import useForm from '../hooks/useForm';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Get fresh config
  const config = getConfig();
  
  // Use state to store logo URL to force re-render when it changes
  const [logoUrl, setLogoUrl] = useState(() => {
    const url = `${config.logoImage}?v=${Date.now()}`;
    console.log('Register initial - Logo URL set to:', url, 'Config:', config);
    return url;
  });
  
  // Update logo URL when config changes
  useEffect(() => {
    const newUrl = `${config.logoImage}?v=${Date.now()}`;
    console.log('Register useEffect - Updating logo URL to:', newUrl, 'Config logo:', config.logoImage);
    setLogoUrl(newUrl);
  }, [config.logoImage, config.name]);
  
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
    if (values.role === 'teacher' && (!values.subjects || values.subjects.length === 0)) {
      errors.subjects = 'Teachers must select at least one subject';
    }
    return errors;
  };

  const { values, errors, touched, handleChange, handleBlur, submit, setValues } = useForm(
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
  
  console.log('Register render - Current logoUrl:', logoUrl, 'Config logo:', config.logoImage, 'Config name:', config.name);

  const availableSubjects = [
    { id: 'math', label: 'Maths', icon: '📐' },
    { id: 'physics', label: 'Physics', icon: '⚛️' },
    { id: 'arabic', label: 'Arabic', icon: '🇲🇦' },
    { id: 'english', label: 'English', icon: '🇬🇧' },
    { id: 'french', label: 'French', icon: '🇫🇷' },
    { id: 'informatique', label: 'IT', icon: '💻' },
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const submitted = await submit(async (formValues) => {
      setLoading(true);
      try {
        const { confirmPassword, ...userData } = formValues;
        const result = await register(userData);

        if (result.success) {
          navigate('/');
        } else {
          setError(result.error);
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
      
      {/* Right Column - Register Form */}
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
          overflowY: 'auto',
        }}
      >
        <Box
          sx={{
            mx: 4,
            my: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 450,
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ p: 2, mb: 1 }}>
              <Box
                component="img"
                src={logoUrl}
                alt={`${config.name} Logo`}
                key={`logo-${config.logoImage}-${logoUrl}`}
                sx={{
                  height: 108,
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
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary.main">
              {config.name}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {/* École Marocaine des Sciences de l'Ingénieur */}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join Our Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              margin="normal"
              value={values.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.firstName && errors.firstName)}
              helperText={touched.firstName ? errors.firstName : ''}
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              margin="normal"
              value={values.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.lastName && errors.lastName)}
              helperText={touched.lastName ? errors.lastName : ''}
              required
            />
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
              helperText={touched.role ? errors.role : ''}
              required
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="parent">Parent</MenuItem>
              <MenuItem value="counselor">Academic Counselor</MenuItem>
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
            
            {values.role === 'teacher' && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <FormLabel component="legend" sx={{ mb: 1 }}>
                  Subjects You Teach *
                </FormLabel>
                <FormGroup row>
                  {availableSubjects.map((subject) => (
                    <FormControlLabel
                      key={subject.id}
                      control={
                        <Checkbox
                          checked={values.subjects.includes(subject.id)}
                          onChange={(e) => {
                            const newSubjects = e.target.checked
                              ? [...values.subjects, subject.id]
                              : values.subjects.filter(s => s !== subject.id);
                            setValues((prev) => ({ ...prev, subjects: newSubjects }));
                          }}
                        />
                      }
                      label={`${subject.icon} ${subject.label}`}
                    />
                  ))}
                </FormGroup>
                {(touched.subjects || values.subjects.length === 0) && errors.subjects && (
                  <Typography variant="caption" color="error">
                    {errors.subjects}
                  </Typography>
                )}
              </Box>
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
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link component={RouterLink} to="/login" underline="hover" variant="body2">
                Already have an account? Log in
              </Link>
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}

