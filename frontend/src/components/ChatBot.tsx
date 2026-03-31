import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import '../styles/ChatBot.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your academic support assistant. How can I help you today? Whether you need academic guidance or just someone to talk to, I\'m here for you.',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExportChat = async () => {
    const rows = messages.map(m => {
      const who = m.sender === 'user' ? 'You' : 'Assistant'
      const whoColor = m.sender === 'user' ? '#667eea' : '#10b981'
      const time = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:${m.sender==='user'?'#f0f4ff':'#f0fdf9'};border-left:4px solid ${whoColor};"><div style="font-size:11px;color:${whoColor};font-weight:700;margin-bottom:4px;">${who} &nbsp;&middot;&nbsp; ${time}</div><div style="font-size:13px;color:#374151;white-space:pre-wrap;">${m.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>`
    }).join('')
    const html = `<div style="font-family:Arial,sans-serif;padding:36px;max-width:700px;"><div style="text-align:center;border-bottom:3px solid #667eea;padding-bottom:16px;margin-bottom:20px;"><h1 style="color:#667eea;font-size:24px;margin:0;">Drop In</h1><h2 style="font-size:16px;color:#374151;margin:4px 0;">AI Counselor Chat Export</h2><p style="color:#6b7280;font-size:12px;margin:0;">Exported ${new Date().toLocaleString()}</p></div>${rows}</div>`
    try {
      await (html2pdf as any)()
        .set({
          margin: 0.4,
          filename: `Chat_Export_${new Date().toISOString().slice(0,10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .from(html)
        .save()
    } catch (err) {
      console.error('Chat export error:', err)
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send to backend
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          student_id: localStorage.getItem('student_id') || 'guest',
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.response) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response || 'Let me help you with that. Could you provide more details?',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I\'m having trouble connecting. Let\'s try that again!',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chat-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open chat assistant"
      >
        <span className="chat-icon">💬</span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="chat-modal">
          <div className="chat-header">
            <h3>Study Assistant</h3>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              {messages.length > 1 && (
                <button
                  onClick={handleExportChat}
                  title="Export chat as PDF"
                  style={{background:'none',border:'1px solid rgba(255,255,255,0.4)',color:'white',borderRadius:'6px',padding:'3px 8px',fontSize:'11px',cursor:'pointer',fontWeight:600}}
                >
                  📄 Export
                </button>
              )}
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender}`}
              >
                <div className="message-content">{message.text}</div>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="send-btn"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
