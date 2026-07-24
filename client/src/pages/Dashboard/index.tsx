import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  Button
} from '@mui/material';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LayersIcon from '@mui/icons-material/Layers';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import PieChartIcon from '@mui/icons-material/PieChart';
import PublicIcon from '@mui/icons-material/Public';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import { useChat } from '../../contexts/ChatContext';


const shortcutCards = [
  {
    title: 'Crime Trends',
    desc: 'Analyse real-time changes in crime volume and trends over daily, monthly, or yearly periods.',
    icon: <TrendingUpIcon sx={{ fontSize: 28 }} />,
    tab: 0
  },
  {
    title: 'Hotspots',
    desc: 'Pinpoint geographic areas with elevated crime densities to deploy local tactical units.',
    icon: <LayersIcon sx={{ fontSize: 28 }} />,
    tab: 1
  },
  {
    title: 'Crime Clusters',
    desc: 'Examine spatial and dimensional clusters of criminal activity in local divisions.',
    icon: <BubbleChartIcon sx={{ fontSize: 28 }} />,
    tab: 2
  },
  {
    title: 'Seasonal Analysis',
    desc: 'Trace seasonal, quarterly, and temporal patterns of incident frequencies.',
    icon: <AcUnitIcon sx={{ fontSize: 28 }} />,
    tab: 3
  },
  {
    title: 'Demographics',
    desc: 'Investigate age, gender, and regional distributions of crime complainants and victims.',
    icon: <PieChartIcon sx={{ fontSize: 28 }} />,
    tab: 4
  },
  {
    title: 'Socio-economic Analysis',
    desc: 'Link crime indicators to complainant occupational groups and district metrics.',
    icon: <PublicIcon sx={{ fontSize: 28 }} />,
    tab: 5
  }
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, sessionId } = useChat();

  const handleOpenConvo = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleShortcutClick = (tabIndex: number) => {
    navigate(`/analytics?tab=${tabIndex}`, { state: { activeTab: tabIndex } });
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // KPI calculations
  const totalCases = conversations.length;
  const activeCases = conversations.filter(c => c.sessionId === sessionId).length;
  const sessionCases = conversations.filter(c => c.sessionId === sessionId).length;
  const latestCase = conversations[0];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        p: 4,
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Header Title Block */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Crime Intelligence Command Center
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Real-time multi-dimensional statistics, strategic shortcuts, and active investigation logs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalPoliceIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
            Secure Terminal
          </Typography>
        </Box>
      </Box>

      {/* 3. Summary Cards Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)'
          },
          gap: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Card 1: Active Cases */}
        <Card
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.08)',
              borderColor: 'primary.main',
            }
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Active Cases
              </Typography>
              <Box sx={{ color: 'primary.main', bgcolor: 'action.hover', p: 0.8, borderRadius: '6px', display: 'flex' }}>
                <DescriptionIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
              {activeCases}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Pending investigation files
            </Typography>
          </CardContent>
        </Card>

        {/* Card 2: Total Cases */}
        <Card
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.08)',
              borderColor: 'primary.main',
            }
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Total Cases
              </Typography>
              <Box sx={{ color: 'primary.main', bgcolor: 'action.hover', p: 0.8, borderRadius: '6px', display: 'flex' }}>
                <FolderSharedIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
              {totalCases}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Total cases saved in database
            </Typography>
          </CardContent>
        </Card>

        {/* Card 3: Latest Filing */}
        <Card
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.08)',
              borderColor: 'primary.main',
            }
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Latest Filing
              </Typography>
              <Box sx={{ color: 'primary.main', bgcolor: 'action.hover', p: 0.8, borderRadius: '6px', display: 'flex' }}>
                <CheckCircleIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                color: 'text.primary', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                mb: 0.8 
              }}
            >
              {latestCase ? latestCase.title : 'No files recorded'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
              {latestCase ? `Created: ${formatTime(latestCase.createdTime)}` : 'Create a file to start'}
            </Typography>
          </CardContent>
        </Card>

        {/* Card 4: Session Cases */}
        <Card
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.08)',
              borderColor: 'primary.main',
            }
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Session Cases
              </Typography>
              <Box sx={{ color: 'primary.main', bgcolor: 'action.hover', p: 0.8, borderRadius: '6px', display: 'flex' }}>
                <LocalPoliceIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 0.5 }}>
              {sessionCases}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Belonging to session badge: {sessionId.replace('session-', '')}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Divider />

      {/* 4. Quick Access Shortcut Panel */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>
          Quick Analytical Shortcuts
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Access specific intelligence analysis modules. Clicking a card will redirect and focus on the section in Analytics.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            },
            gridAutoRows: '1fr',
            gap: '24px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {shortcutCards.map((card, index) => (
            <Tooltip key={index} title={card.desc} arrow placement="top">
              <Card
                onClick={() => handleShortcutClick(card.tab)}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 28px rgba(124, 58, 237, 0.12)',
                    borderColor: 'primary.main',
                    '& .arrow-icon': {
                      transform: 'translateX(4px)',
                      color: 'primary.main'
                    },
                    '& .icon-box': {
                      bgcolor: 'primary.main',
                      color: '#FFFFFF'
                    }
                  },
                  '&:active': {
                    transform: 'scale(0.98)'
                  }
                }}
              >
                <CardContent 
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%', 
                    flexGrow: 1,
                    boxSizing: 'border-box',
                    '&:last-child': { pb: 3 }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box 
                      className="icon-box"
                      sx={{ 
                        color: 'primary.main', 
                        bgcolor: 'action.hover', 
                        p: 1.2, 
                        borderRadius: '8px', 
                        display: 'flex',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {card.icon}
                    </Box>
                    <ArrowForwardIcon 
                      className="arrow-icon" 
                      sx={{ 
                        color: 'text.secondary', 
                        transition: 'all 0.3s ease',
                        fontSize: 18
                      }} 
                    />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 800, 
                      color: 'text.primary', 
                      fontSize: '1.05rem',
                      lineHeight: 1.4,
                      wordBreak: 'break-word'
                    }}
                  >
                    {card.title}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
