import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, Sparkles, CornerDownLeft, Database } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export const AiChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I am your AI Copilot Traffic Analyst. I have access to the active local RTA traffic datasets (including volume logs, incident logs, metro ridership, Salik tolls, and intersection delay performance). Ask me any question to query the data!",
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/mistral/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(1).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message || "No analytical response returned.",
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to get chat response:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Error: Failed to connect to the AI Copilot API. Check your connection or API key status.",
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "What is the peak traffic volume on Sheikh Zayed Road?",
    "Summarize recent active incident logs in our data",
    "Show average delay and saturation at Defence Intersection",
    "What is the daily ridership pattern on the Metro?",
    "Show average Salik toll logs and hourly volumes"
  ];

  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ color: 'var(--text-title)', fontWeight: 700 }}>{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={lineIdx} style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-title)', marginTop: '12px', marginBottom: '6px' }}>
            {parseInlineStyles(line.substring(4))}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={lineIdx} style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', marginTop: '14px', marginBottom: '8px' }}>
            {parseInlineStyles(line.substring(3))}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={lineIdx} style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-title)', marginTop: '16px', marginBottom: '10px' }}>
            {parseInlineStyles(line.substring(2))}
          </h2>
        );
      }

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const cleanLine = line.trim().substring(2);
        return (
          <div key={lineIdx} style={{ display: 'flex', gap: '8px', paddingLeft: '8px', margin: '4px 0', fontSize: '14px', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--rta-blue)' }}>•</span>
            <span style={{ flex: 1 }}>{parseInlineStyles(cleanLine)}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={lineIdx} style={{ height: '8px' }} />;
      }

      return (
        <p key={lineIdx} style={{ margin: '4px 0', fontSize: '14.5px', lineHeight: 1.5 }}>
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  return (
    <div 
      className="detail-card animate-fade-in" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 280px)', 
        minHeight: '500px',
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card)'
      }}
    >
      {/* Panel Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-panel)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--rta-blue-bg)', color: 'var(--rta-blue)', padding: '6px', borderRadius: '6px' }}>
            <Cpu size={18} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-title)' }}>AI Copilot Analyst</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={11} /> 8 Local Datasets Loaded
            </div>
          </div>
        </div>
        <span 
          style={{ 
            fontSize: '11px', 
            background: 'rgba(34, 197, 94, 0.15)', 
            color: 'var(--color-low)', 
            padding: '3px 8px', 
            borderRadius: '4px', 
            fontWeight: 700 
          }}
        >
          LIVE AGENT
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        {messages.map(msg => (
          <div 
            key={msg.id}
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div 
              style={{ 
                background: msg.sender === 'user' ? 'var(--rta-blue)' : 'var(--bg-main)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                padding: '12px 16px',
                borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: '14px',
                lineHeight: 1.5
              }}
            >
              {renderFormattedText(msg.text)}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px 12px 12px 2px', maxWidth: '100px', alignSelf: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Analysing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} className="text-muted" /> Try asking:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                className="kpi-card"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div 
        style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-panel)'
        }}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query traffic logs, delays, or metro ridership..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 48px 12px 16px',
              color: 'var(--text-primary)',
              fontSize: '14.5px',
              outline: 'none',
              transition: 'border 0.2s ease'
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              background: input.trim() ? 'var(--rta-blue)' : 'transparent',
              color: input.trim() ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
export default AiChatPanel;
