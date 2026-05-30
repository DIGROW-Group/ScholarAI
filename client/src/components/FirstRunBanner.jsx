import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import { Close } from '@mui/icons-material';

const FirstRunBanner = ({ role, onAction, onDismiss }) => {
  const config = {
    student: {
      emoji: '🎓',
      headline: 'Welcome! Ready to start learning?',
      description: 'Ask your first question to our AI tutor to begin your learning journey.',
      buttonLabel: 'Ask my first question',
      actionKey: 'openTutor',
    },
    teacher: {
      emoji: '📚',
      headline: 'Welcome! Let\'s set up your content.',
      description: 'Upload your first document to provide learning materials to your students.',
      buttonLabel: 'Upload a document',
      actionKey: 'openUpload',
    },
    admin: {
      emoji: '⚙️',
      headline: 'Welcome! Create your first classroom.',
      description: 'Set up a classroom to manage teachers and students across your institution.',
      buttonLabel: 'Create a classroom',
      actionKey: 'openCreateClassroom',
    },
    parent: {
      emoji: '👨‍👩‍👧',
      headline: 'Welcome! Link your child\'s account.',
      description: 'Connect with your child\'s academic progress and stay informed about their learning.',
      buttonLabel: 'Link my child',
      actionKey: 'openLinkChild',
    },
    counselor: {
      emoji: '💬',
      headline: 'Welcome! Review your students.',
      description: 'View student progress and provide guidance to support their academic success.',
      buttonLabel: 'View my students',
      actionKey: 'openStudents',
    },
  };

  const currentConfig = config[role] || config.student;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderLeft: '6px solid #ea9b20',
        background: 'linear-gradient(135deg, rgba(234, 155, 32, 0.08) 0%, rgba(234, 155, 32, 0.04) 100%)',
        position: 'relative',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Icon */}
        <Box sx={{ fontSize: '2.5rem', mt: 0.5 }}>
          {currentConfig.emoji}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, pr: 5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#333',
              mb: 0.5,
            }}
          >
            {currentConfig.headline}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#666',
              mb: 2,
            }}
          >
            {currentConfig.description}
          </Typography>

          {/* CTA Button */}
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#ea9b20',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#d68918',
              },
            }}
            onClick={() => onAction(currentConfig.actionKey)}
          >
            {currentConfig.buttonLabel}
          </Button>
        </Box>

        {/* Dismiss Button */}
        <IconButton
          size="small"
          onClick={onDismiss}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#999',
            '&:hover': {
              color: '#333',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
            },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default FirstRunBanner;
