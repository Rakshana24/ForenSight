import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Avatar } from '@mui/material';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useChat } from '../../contexts/ChatContext';

const ChatHeader: React.FC = () => {
  const { sessionId } = useChat();

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        height: 64,
        borderBottom: '1px solid #E5E7EB',
        bgcolor: '#FFFFFF',
        justifyContent: 'center'
      }}
    >
      <Toolbar sx={{ px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left Section: Branding and Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalPoliceIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography
              variant="h6"
              color="primary"
              fontWeight="bold"
              sx={{ fontSize: '1.2rem', lineHeight: 1.2, letterSpacing: 0.5 }}
            >
              ForenSight
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}
            >
              Crime Intelligence Platform
            </Typography>
          </Box>
        </Box>

        {/* Right Section: Session ID badge and User Profile Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<AccountCircleIcon fontSize="small" />}
            label={`Session: ${sessionId}`}
            color="primary"
            variant="outlined"
            size="medium"
            sx={{
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              borderColor: '#E5E7EB',
              color: '#1F2937',
              '& .MuiChip-icon': {
                color: '#1E3A8A'
              }
            }}
          />
          
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: '#1E3A8A', 
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '2px solid #E5E7EB'
            }}
          >
            IO
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ChatHeader;
