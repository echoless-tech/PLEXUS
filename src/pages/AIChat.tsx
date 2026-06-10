import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles } from 'lucide-react';
import { AIBlob, BlobState } from '../components/common/AIBlob';
import { useAppStore } from '../stores/appStore';
import { chatWithCoach, buildBusinessContext, ChatMessage } from '../services/ai';
import { cn } from '../lib/cn';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

const QUICK_ACTIONS = [
  'How am I doing vs competitors?',
  'Forecast my revenue',
  'Find growth opportunities',
  'Any anomalies to worry about?',
];

const WELCOME =
  "Hi, I'm **NODAL AI** — your business coach. I read your live data and compare it against thousands of similar SMEs.\n\nAsk me anything, or tap a suggestion below.";

const FALLBACK =
  "I'm having trouble reaching the AI service right now. Please try again in a moment — in the meantime, the **AI Hub** has cached insights you can explore.";

const AIChat: React.FC = () => {
  const { products, sales, cashFlow, businessProfile } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([{ id: 1, text: WELCOME, sender: 'ai' }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const hasConversation = messages.length > 1;
  const blobState: BlobState = thinking ? 'thinking' : input.trim() ? 'listening' : 'idle';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const ask = async (query: string) => {
    if (!query.trim() || thinking) return;

    const userMsg: Message = { id: Date.now(), text: query, sender: 'user' };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setThinking(true);

    let responseText = FALLBACK;
    try {
      const context = buildBusinessContext({ products, sales, cashFlow, businessProfile });
      const history: ChatMessage[] = next
        .filter((m) => m.id !== 1)
        .map((m) => ({ text: m.text, sender: m.sender }));
      responseText = await chatWithCoach(query, history, context, 'AI Coach');
    } catch {
      responseText = FALLBACK;
    }

    setMessages((prev) => [...prev, { id: Date.now() + 1, text: responseText, sender: 'ai' }]);
    setThinking(false);
  };

  return (
    <div className="animate-rise flex h-[calc(100vh-140px)] flex-col">
      {/* Hero blob — shrinks once a conversation starts */}
      <div
        className={cn(
          'flex shrink-0 flex-col items-center justify-center transition-all duration-500',
          hasConversation ? 'py-4' : 'flex-1',
        )}
      >
        <AIBlob size={hasConversation ? 96 : 200} state={blobState} />
        {!hasConversation && (
          <>
            <h1 className="mt-6 text-[1.75rem] font-bold tracking-[-0.02em] text-ink">NODAL AI</h1>
            <p className="mt-1.5 max-w-sm text-center text-[0.9375rem] text-muted">
              Your always-on business coach, tuned to your live data.
            </p>
          </>
        )}
      </div>

      {/* Conversation */}
      {hasConversation && (
        <div className="nodal-scroll flex-1 space-y-4 overflow-y-auto px-1 py-2">
          {messages.map((m) =>
            m.sender === 'ai' ? (
              <div key={m.id} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <AIBlob size={32} state="idle" />
                </div>
                <div className="glass max-w-[80%] rounded-[18px] rounded-tl-md px-4 py-3 text-[0.9375rem] leading-relaxed text-ink">
                  <div className="ai-markdown">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-[18px] rounded-tr-md bg-accent px-4 py-3 text-[0.9375rem] leading-relaxed text-accent-contrast">
                  {m.text}
                </div>
              </div>
            ),
          )}
          {thinking && (
            <div className="flex items-center gap-3">
              <AIBlob size={32} state="thinking" />
              <div className="glass flex items-center gap-1.5 rounded-full px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Quick actions */}
      {!hasConversation && (
        <div className="mb-4 flex shrink-0 flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => ask(a)}
              className="neu-sm inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[0.8125rem] font-medium text-ink transition-colors hover:text-accent"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> {a}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="glass-strong flex shrink-0 items-center gap-2 rounded-full p-1.5 pl-5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask NODAL AI anything…"
          className="flex-1 bg-transparent text-[0.9375rem] text-ink placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          aria-label="Send"
          className="neu grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-contrast disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default AIChat;
