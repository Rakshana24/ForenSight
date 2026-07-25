import React, { useState } from 'react';
import { Box, Tooltip, IconButton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useChat } from '../../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';

const AIBubble: React.FC = () => {
  const { createNewConversation } = useChat();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const newId = await createNewConversation('New AI Investigation');
      navigate(`/chat/${newId}`);
    } catch (error) {
      console.error('Failed to create AI conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Siri Keyframe Animations */}
      <style>{`
        @keyframes siri-pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(2, 132, 199, 0.5), 
                        0 0 40px rgba(6, 182, 212, 0.3), 
                        0 0 60px rgba(236, 72, 153, 0.2);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 35px rgba(2, 132, 199, 0.8), 
                        0 0 70px rgba(6, 182, 212, 0.5), 
                        0 0 100px rgba(236, 72, 153, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(2, 132, 199, 0.5), 
                        0 0 40px rgba(6, 182, 212, 0.3), 
                        0 0 60px rgba(236, 72, 153, 0.2);
          }
        }

        @keyframes siri-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes orbit-rotate-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes orbit-rotate-counter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* Dynamic Outer Orbiting Rings */}
      <Box
        sx={{
          position: 'absolute',
          width: 76,
          height: 76,
          borderRadius: '50%',
          border: '1.5px dashed rgba(6, 182, 212, 0.4)',
          animation: 'orbit-rotate-clockwise 15s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 86,
          height: 86,
          borderRadius: '50%',
          border: '1px dotted rgba(236, 72, 153, 0.35)',
          animation: 'orbit-rotate-counter 20s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* AI Assistant Glowing Beating Sphere */}
      <Tooltip title="Ask AI (New Investigation)" placement="left" arrow>
        <IconButton
          onClick={handleClick}
          disabled={loading}
          sx={{
            width: 56,
            height: 56,
            background: 'linear-gradient(-45deg, #1E3A8A, #38BDF8, #0EA5E9, #06B6D4)',
            backgroundSize: '400% 400%',
            animation: 'siri-gradient 6s ease infinite, siri-pulse 3s infinite ease-in-out',
            borderRadius: '50%',
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.12) rotate(15deg)',
              boxShadow: '0 0 40px rgba(2, 132, 199, 0.9), 0 0 80px rgba(6, 182, 212, 0.7)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default AIBubble;
