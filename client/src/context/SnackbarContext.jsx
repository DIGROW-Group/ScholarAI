import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const show = useCallback((message, severity = 'info') => {
    setQueue(prev => [...prev, { message, severity }]);
  }, []);

  React.useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [queue, current]);

  const handleClose = () => {
    setCurrent(null);
  };

  const handleExited = () => {
    if (queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  };

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <Snackbar
        key={current?.message}
        open={!!current}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={4000}
        onClose={handleClose}
        TransitionComponent={(props) => <Slide {...props} direction="up" />}
        onExited={handleExited}
      >
        <Alert severity={current?.severity || 'info'} variant="filled" sx={{ borderRadius: 2, minWidth: 300 }}>
          {current?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}
