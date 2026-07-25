import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, List, TextField, Typography, InputAdornment, ListItemButton, ListItemText, Avatar, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';

import { useTheme } from '@mui/material/styles';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, logout } = useAuth();

  const {
    conversations,
    currentConversation,
    selectConversation,
    createNewConversation,
    deleteSelectedConversation,
    sessionId,
    setSessionId,
    loading
  } = useChat();

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionInput, setSessionInput] = useState(sessionId);
  const [showSettings, setShowSettings] = useState(false);

  // Sync settings input field when active sessionId changes
  React.useEffect(() => {
    setSessionInput(sessionId);
  }, [sessionId]);

  const handleStartNew = async () => {
    try {
      const newId = await createNewConversation('New Investigation');
      navigate(`/chat/${newId}`);
    } catch (e) {
      // Error handled by ChatContext
    }
  };

  const handleSelectConvo = async (id: string) => {
    await selectConversation(id);
    navigate(`/chat/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      const isActive = currentConversation?.conversationId === id;
      await deleteSelectedConversation(id);
      if (isActive) {
        navigate('/', { replace: true });
      }
    }
  };

  const handleSaveSession = () => {
    const cleanSession = sessionInput.trim();
    if (cleanSession) {
      setSessionId(cleanSession);
      setShowSettings(false);
      navigate('/');
    }
  };

  const formatTimeOnly = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const formatDateOnly = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const groupConversations = (convos: typeof conversations) => {
    const todayList: typeof conversations = [];
    const yesterdayList: typeof conversations = [];
    const olderList: typeof conversations = [];

    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    convos.forEach((convo) => {
      const convoDate = new Date(convo.createdTime);
      const convoDateStr = convoDate.toDateString();

      if (convoDateStr === todayStr) {
        todayList.push(convo);
      } else if (convoDateStr === yesterdayStr) {
        yesterdayList.push(convo);
      } else {
        olderList.push(convo);
      }
    });

    return { Today: todayList, Yesterday: yesterdayList, Older: olderList };
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = groupConversations(filteredConversations);
  const isDashboardActive = location.pathname === '/dashboard';

  const renderGroupList = (groupTitle: string, items: typeof conversations) => {
    if (items.length === 0) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ display: 'block', px: 2.5, mb: 1, fontWeight: 'bold', fontSize: '0.72rem', letterSpacing: 0.5 }}
        >
          {groupTitle}
        </Typography>
        <List disablePadding>
          {items.map((convo) => {
            const isActive = location.pathname === `/chat/${convo.conversationId}`;
            return (
              <ListItemButton
                key={convo.conversationId}
                selected={isActive}
                onClick={() => handleSelectConvo(convo.conversationId)}
                sx={{
                  borderRadius: '6px',
                  mx: 1.5,
                  mb: 0.5,
                  py: 0.6,
                  px: 1.5,
                  bgcolor: isActive 
                    ? ((theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)') 
                    : 'transparent',
                  '&.Mui-selected': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)',
                    '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.09)' }
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  position: 'relative',
                  '&:hover .delete-btn': { opacity: 0.8 },
                  '&:hover .time-label': { opacity: 0 }
                }}
              >
                <DescriptionIcon 
                  fontSize="small" 
                  sx={{ 
                    mr: 1.5, 
                    color: isActive ? 'primary.main' : 'text.secondary',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }} 
                />
                
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontSize: '0.825rem',
                        pr: 4
                      }}
                    >
                      {convo.title.replace(/siri/gi, 'New')}
                    </Typography>
                  }
                />

                {/* Right side time/date or delete button */}
                <Box
                  sx={{
                    position: 'absolute',
                    right: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Typography 
                    className="time-label"
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.7rem',
                      opacity: 0.8,
                      display: 'block',
                      transition: 'opacity 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {groupTitle === 'Today' 
                      ? formatTimeOnly(convo.createdTime) 
                      : formatDateOnly(convo.createdTime)
                    }
                  </Typography>

                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={(e) => handleDelete(convo.conversationId, e)}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      bgcolor: 'background.paper',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      p: 0.25,
                      '&:hover': {
                        color: 'error.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Box>
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      {/* 1. Sidebar Top Action Triggers */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        
        {/* Dashboard Link */}
        <ListItemButton
          selected={isDashboardActive}
          onClick={() => navigate('/dashboard')}
          sx={{
            borderRadius: '8px',
            py: 1,
            px: 2,
            bgcolor: 'transparent',
            '&.Mui-selected': {
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'action.hover' }
            },
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }}
        >
          <HomeIcon 
            fontSize="small" 
            sx={{ 
              mr: 2, 
              color: isDashboardActive ? 'primary.main' : 'text.secondary',
              transition: 'color 0.2s ease'
            }} 
          />
          <ListItemText
            primary={
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: isDashboardActive ? 700 : 500, 
                  color: isDashboardActive ? 'primary.main' : 'text.primary',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s ease'
                }}
              >
                Dashboard
              </Typography>
            }
          />
        </ListItemButton>

        {/* Intelligence Link */}
        <ListItemButton
          selected={location.pathname === '/intelligence'}
          onClick={() => navigate('/intelligence')}
          sx={{
            borderRadius: '8px',
            py: 1,
            px: 2,
            bgcolor: 'transparent',
            '&.Mui-selected': {
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'action.hover' }
            },
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }}
        >
          <SearchIcon 
            fontSize="small" 
            sx={{ 
              mr: 2, 
              color: location.pathname === '/intelligence' ? 'primary.main' : 'text.secondary',
              transition: 'color 0.2s ease'
            }} 
          />
          <ListItemText
            primary={
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: location.pathname === '/intelligence' ? 700 : 500, 
                  color: location.pathname === '/intelligence' ? 'primary.main' : 'text.primary',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s ease'
                }}
              >
                Intelligence
              </Typography>
            }
          />
        </ListItemButton>

        {/* Analytics Link */}
        <ListItemButton
          selected={location.pathname === '/analytics'}
          onClick={() => navigate('/analytics')}
          sx={{
            borderRadius: '8px',
            py: 1,
            px: 2,
            bgcolor: 'transparent',
            '&.Mui-selected': {
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'action.hover' }
            },
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }}
        >
          <TrendingUpIcon 
            fontSize="small" 
            sx={{ 
              mr: 2, 
              color: location.pathname === '/analytics' ? 'primary.main' : 'text.secondary',
              transition: 'color 0.2s ease'
            }} 
          />
          <ListItemText
            primary={
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: location.pathname === '/analytics' ? 700 : 500, 
                  color: location.pathname === '/analytics' ? 'primary.main' : 'text.primary',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s ease'
                }}
              >
                Analytics
              </Typography>
            }
          />
        </ListItemButton>
      </Box>

      {/* 2. New Investigation & Search Box */}
      <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        {/* Start New Chat Button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleStartNew}
          disabled={loading}
          sx={{
            py: 1.1,
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: 'primary.dark',
            }
          }}
        >
          New Investigation
        </Button>

        {/* Search Field */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search Investigations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F3F4F6',
              fontSize: '0.825rem',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'primary.main' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1px' },
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" sx={{ opacity: 0.7 }} />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      {/* 3. Scrollable Investigation Logs List Grouped by Date */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {filteredConversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
              No active investigations.
            </Typography>
          </Box>
        ) : (
          <>
            {renderGroupList('Today', grouped.Today)}
            {renderGroupList('Yesterday', grouped.Yesterday)}
            {renderGroupList('Older', grouped.Older)}
          </>
        )}
      </Box>

      {/* 4. Footer Settings Session Profile Card */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {showSettings ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0.5 }}>
            <TextField
              size="small"
              label="Session Identifier"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              sx={{ bgcolor: 'background.default' }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                onClick={handleSaveSession}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => {
                  setSessionInput(sessionId);
                  setShowSettings(false);
                }}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.5,
              px: 1,
              borderRadius: '8px',
              minWidth: 0,
              flex: 1,
              transition: 'background-color 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1, mr: 1 }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0
                }}
              >
                {user ? user.first_name[0].toUpperCase() : 'A'}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'text.primary', 
                    fontSize: '0.85rem', 
                    lineHeight: 1.2,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {user ? `${user.first_name} ${user.last_name}` : 'Officer'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, minWidth: 0 }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: '0.7rem', 
                      lineHeight: 1,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {user ? user.email_id : 'Workspace Active'}
                  </Typography>
                  <Box sx={{ width: 6, height: 6, bgcolor: '#10B981', borderRadius: '50%', boxShadow: '0 0 4px #10B981', flexShrink: 0 }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Configure Session" arrow>
                <IconButton 
                  size="small" 
                  onClick={() => setShowSettings(true)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Log Out" arrow>
                <IconButton 
                  size="small" 
                  onClick={logout}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
