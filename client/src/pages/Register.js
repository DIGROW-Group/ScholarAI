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
import { School } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getConfig } from '../config/appConfig';

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
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student',
    grade: '',
    subjects: [],
  });
  
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.role === 'teacher' && formData.subjects.length === 0) {
      setError('Teachers must select at least one subject');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
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
              margin="normal"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Last Name"
              margin="normal"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              select
              label="Role"
              margin="normal"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="parent">Parent</MenuItem>
              <MenuItem value="counselor">Academic Counselor</MenuItem>
            </TextField>
            {formData.role === 'student' && (
              <TextField
                fullWidth
                select
                label="Grade"
                margin="normal"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                required
                helperText="Select your current grade level"
              >
                <MenuItem value="1ere College">1ère Collège</MenuItem>
                <MenuItem value="2eme College">2ème Collège</MenuItem>
                <MenuItem value="3eme College">3ème Collège</MenuItem>
                <MenuItem value="Tronc Commun">Tronc Commun</MenuItem>
                <MenuItem value="1ere Bac">1ère Bac</MenuItem>
                <MenuItem value="2eme Bac">2ème Bac</MenuItem>
              </TextField>
            )}
            
            {formData.role === 'teacher' && (
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
                          checked={formData.subjects.includes(subject.id)}
                          onChange={(e) => {
                            const newSubjects = e.target.checked
                              ? [...formData.subjects, subject.id]
                              : formData.subjects.filter(s => s !== subject.id);
                            setFormData({ ...formData, subjects: newSubjects });
                          }}
                        />
                      }
                      label={`${subject.icon} ${subject.label}`}
                    />
                  ))}
                </FormGroup>
                {formData.subjects.length === 0 && (
                  <Typography variant="caption" color="error">
                    Please select at least one subject
                  </Typography>
                )}
              </Box>
            )}
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              margin="normal"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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

