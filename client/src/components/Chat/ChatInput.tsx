import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Box, TextField, IconButton, Select, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VoiceRecorder from './VoiceRecorder';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onVoiceRecordingComplete?: (blob: Blob | null) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, onVoiceRecordingComplete }) => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'recorded' | 'transcribing'>('idle');

  const isTranscribing = recorderState === 'transcribing';
  const isInputDisabled = disabled || isTranscribing;

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
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
      {/* Dynamic Language Selection Dropdown (Only visible during idle state) */}
      {recorderState === 'idle' && (
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value as string)}
          size="small"
          variant="outlined"
          disabled={disabled}
          sx={{
            fontSize: '0.75rem',
            height: '32px',
            minWidth: '65px',
            '& .MuiSelect-select': {
              py: 0.5,
              px: 1,
            }
          }}
        >
          <MenuItem value="en" sx={{ fontSize: '0.75rem' }}>EN</MenuItem>
          <MenuItem value="hi" sx={{ fontSize: '0.75rem' }}>HI</MenuItem>
          <MenuItem value="kn" sx={{ fontSize: '0.75rem' }}>KN</MenuItem>
        </Select>
      )}

      {/* Modular Voice Recorder Component */}
      <VoiceRecorder
        onRecordingComplete={onVoiceRecordingComplete}
        onTranscriptionComplete={(transcribedText) => {
          setText(transcribedText);
        }}
        language={language}
        onStateChange={setRecorderState}
        disabled={disabled}
      />

      {/* Standard Text Chat Inputs (Hidden during active recording) */}
      {recorderState !== 'recording' && (
        <>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? 'Transcribing voice input...' : 'Type your message here... (Press Enter to send)'}
            disabled={isInputDisabled}
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
            disabled={isInputDisabled || !text.trim()}
            sx={{
              bgcolor: text.trim() && !isInputDisabled ? 'primary.main' : 'action.disabledBackground',
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
        </>
      )}
    </Box>
  );
};

export default ChatInput;
