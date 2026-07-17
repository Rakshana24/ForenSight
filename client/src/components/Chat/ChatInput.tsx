import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const cleanText = text.trim();
    if (cleanText) {
      onSend(cleanText);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message here... (Press Enter to send)"
        disabled={disabled}
        size="small"
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
          }
        }}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        sx={{
          bgcolor: text.trim() && !disabled ? 'primary.main' : 'action.disabledBackground',
          color: '#fff',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          borderRadius: 1,
          p: 1.2
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default ChatInput;
