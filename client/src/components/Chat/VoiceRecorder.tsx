import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, Tooltip, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  onTranscriptionComplete: (text: string) => void;
  language: string;
  onStateChange?: (state: 'idle' | 'recording' | 'recorded' | 'transcribing') => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onTranscriptionComplete,
  language,
  onStateChange,
  disabled
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'transcribing'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const leftChannelRef = useRef<Float32Array[]>([]);
  const recordingLengthRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    setErrorMessage(null);
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AudioContextClass) {
      setErrorMessage('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 4096 block size, mono input, mono output
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      leftChannelRef.current = [];
      recordingLengthRef.current = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        leftChannelRef.current.push(new Float32Array(inputData));
        recordingLengthRef.current += inputData.length;
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setStatus('recording');
      onStateChange?.('recording');

      // Start elapsed timer
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access.');
      } else {
        setErrorMessage('Unable to record audio. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop streams & clean up nodes
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Flatten left channel samples
    const leftChannel = leftChannelRef.current;
    const recordingLength = recordingLengthRef.current;
    const result = new Float32Array(recordingLength);
    let offset = 0;
    for (let i = 0; i < leftChannel.length; i++) {
      result.set(leftChannel[i], offset);
      offset += leftChannel[i].length;
    }

    // Encode PCM into WAV ArrayBuffer
    const buffer = new ArrayBuffer(44 + result.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Header RIFF WAV
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + result.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, result.length * 2, true);

    // Audio samples
    let index = 44;
    for (let i = 0; i < result.length; i++) {
      const s = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      index += 2;
    }

    const wavBlob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);
    onRecordingComplete(wavBlob);

    // Transcribe
    triggerTranscription(wavBlob, url);
  };

  const triggerTranscription = async (blob: Blob, url: string) => {
    try {
      setStatus('transcribing');
      onStateChange?.('transcribing');

      const base64Data = await convertBlobToBase64(blob);

      console.log('[VoiceRecorder] Sending WAV audio for Zia STT in language:', language);
      const res = await fetch('/server/foren_sight_function/voice/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: base64Data,
          language: language
        })
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      console.log('[VoiceRecorder] Transcription succeeded:', resData.text);
      onTranscriptionComplete(resData.text || '');

      setStatus('recorded');
      onStateChange?.('recorded');
    } catch (err: any) {
      console.error('[VoiceRecorder] STT Error:', err.message);
      setErrorMessage(err.message || 'Unable to transcribe audio. Please try again.');
      setStatus('idle');
      onStateChange?.('idle');
      onRecordingComplete(null);
      if (url) {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onRecordingComplete(null);
    setStatus('idle');
    onStateChange?.('idle');
    setErrorMessage(null);
  };

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  if (status === 'idle') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title={errorMessage || 'Record Voice'}>
          <span>
            <IconButton
              color={errorMessage ? 'error' : 'primary'}
              onClick={startRecording}
              disabled={disabled}
              sx={{
                borderRadius: 1,
                bgcolor: errorMessage ? '#fef2f2' : 'transparent',
                '&:hover': {
                  bgcolor: errorMessage ? '#fee2e2' : 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              <MicIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {errorMessage && (
          <Typography variant="caption" color="error" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 500 }}>
            {errorMessage}
          </Typography>
        )}
      </Box>
    );
  }

  if (status === 'recording') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: 1,
          px: 2,
          py: 0.8,
          flex: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FiberManualRecordIcon
            sx={{
              color: '#ef4444',
              fontSize: 16,
              animation: 'pulse 1s infinite alternate',
              '@keyframes pulse': {
                '0%': { opacity: 0.4 },
                '100%': { opacity: 1 }
              }
            }}
          />
          <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
            Recording...
          </Typography>
          <Typography variant="body2" sx={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {formatTime(recordingTime)}
          </Typography>
        </Box>
        <IconButton
          color="error"
          onClick={stopRecording}
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: '#fee2e2',
            '&:hover': { bgcolor: '#fca5a5' }
          }}
        >
          <StopIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  if (status === 'transcribing') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: '#f0fdf4',
          border: '1px solid #dcfce7',
          borderRadius: 1,
          px: 2,
          py: 0.8,
          flex: 1
        }}
      >
        <CircularProgress size={16} sx={{ color: '#16a34a' }} />
        <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 'bold' }}>
          Transcribing...
        </Typography>
      </Box>
    );
  }

  // Recorded state: Render preview audio player and delete action
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 0.8,
        bgcolor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 1
      }}
    >
      <audio
        src={audioUrl || ''}
        controls
        style={{
          height: '32px',
          maxWidth: '220px'
        }}
      />
      <Tooltip title="Delete Recording">
        <IconButton
          color="error"
          onClick={deleteRecording}
          size="small"
          sx={{
            bgcolor: '#fee2e2',
            '&:hover': { bgcolor: '#fca5a5' },
            borderRadius: 1
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default VoiceRecorder;
