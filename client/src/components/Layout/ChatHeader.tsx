import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Avatar, IconButton, Tooltip } from '@mui/material';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useChat } from '../../contexts/ChatContext';
import { useAppTheme } from '../../contexts/ThemeContext';

const ChatHeader: React.FC = () => {
  const { sessionId } = useChat();
  const { themeMode, toggleTheme } = useAppTheme();

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        height: 64,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        justifyContent: 'center',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
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
              sx={{ fontSize: '1.2rem', lineHeight: 1.2, letterSpacing: 0.5, fontWeight: 'bold' }}
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

        {/* Right Section: Theme switch, Session ID badge and User Profile Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Global Theme Switcher */}
          <Tooltip title={themeMode === 'light' ? 'Tactical Dark Mode' : 'Standard Light Mode'}>
            <IconButton 
              onClick={toggleTheme}
              sx={{ 
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '4px',
                p: 0.8,
                bgcolor: 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected'
                }
              }}
            >
              {themeMode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

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
              borderColor: 'divider',
              color: 'text.primary',
              '& .MuiChip-icon': {
                color: 'primary.main'
              }
            }}
          />
          
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: 'primary.main', 
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '2px solid',
              borderColor: 'divider'
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
