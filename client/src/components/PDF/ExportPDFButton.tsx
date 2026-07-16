import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useChat } from '../../contexts/ChatContext';

const ExportPDFButton: React.FC = () => {
  const { exportCurrentPDF, loading, currentConversation } = useChat();

  if (!currentConversation) return null;

  return (
    <Button
      variant="contained"
      color="primary"
      fullWidth
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
      onClick={exportCurrentPDF}
      disabled={loading}
      sx={{
        borderRadius: 1,
        textTransform: 'none',
        fontWeight: 'bold',
        py: 1,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        }
      }}
    >
      Export PDF Report
    </Button>
  );
};

export default ExportPDFButton;
