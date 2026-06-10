import React, { useState } from 'react';
import { AIBlob } from './AIBlob';
import { VoiceHud } from './VoiceHud';

/**
 * App-wide floating AI blob. Tapping it opens the live voice assistant
 * (speech-to-text → AI → text-to-speech).
 */
export const AIBlobFab: React.FC = () => {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Talk to NODAL AI"
        onClick={() => setVoiceOpen(true)}
        className="neu fixed bottom-6 right-6 z-[1200] grid h-16 w-16 place-items-center rounded-full"
        style={{ background: 'transparent' }}
      >
        <AIBlob size={56} state="idle" />
      </button>

      <VoiceHud open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </>
  );
};

export default AIBlobFab;
