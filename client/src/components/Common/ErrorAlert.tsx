import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useChat } from '../../contexts/ChatContext';

const ErrorAlert: React.FC = () => {
  const { error, setError } = useChat();

  const handleClose = () => {
    setError(null);
  };

  return (
    <Snackbar
      open={!!error}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={handleClose} severity="error" variant="filled" sx={{ width: '100%' }}>
        {error}
      </Alert>
    </Snackbar>
  );
};

export default ErrorAlert;
