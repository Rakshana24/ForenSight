import React from 'react';
import { CircularProgress, Box } from '@mui/material';

const LoadingSpinner: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px', width: '100%' }}>
      <CircularProgress size={30} color="primary" />
    </Box>
  );
};

export default LoadingSpinner;
