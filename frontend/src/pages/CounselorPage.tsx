import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { ArrowLeft, Send, Bot, User, Sparkles, Heart, BookOpen, Brain } from 'lucide-react'
import '../styles/CounselorPage.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  emotion?: string | null
  encouragement?: string | null
  suggestedActions?: string[]
  timestamp: Date
}

const quickPrompts = [
  { icon: '📊', text: 'How am I performing?', category: 'academic' },
  { icon: '📚', text: 'Give me study tips', category: 'academic' },
  { icon: '🎯', text: 'Help me prepare for exams', category: 'academic' },
  { icon: '💡', text: 'What strategies should I follow?', category: 'academic' },
  { icon: '😟', text: "I'm feeling stressed", category: 'wellness' },
  { icon: '⏰', text: 'Help with time management', category: 'academic' },
  { icon: '🧠', text: "I can't focus", category: 'wellness' },
  { icon: '🌟', text: 'I need motivation', category: 'wellness' },
]

export default function CounselorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()
  const { studentId, studentName } = useStudent()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Welcome message
    const welcome: Message = {
      role: 'assistant',
      content: `Hi${studentName ? ` ${studentName}` : ''}! 👋 I'm your **AI Academic Counselor**.\n\nI'm here to help you with:\n\n📚 **Academics** — study tips, exam prep, performance insights\n🧠 **Mental Wellness** — stress, motivation, staying positive\n📋 **Planning** — study schedules, time management\n\nHow are you doing today? You can type anything or tap a quick option below!`,
      timestamp: new Date(),
      encouragement: 'Every conversation is a step forward!'
    }
    setMessages([welcome])
  }, [studentName])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setShowQuickPrompts(false)
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const response = await chatAPI.sendMessage(text.trim(), studentId || 'guest', history)
      const data = response.data

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        emotion: data.detected_emotion,
        encouragement: data.encouragement,
        suggestedActions: data.suggested_actions,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm having a moment — please try again! I'm here for you.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const getEmotionBadge = (emotion: string) => {
    const badges: Record<string, { emoji: string; label: string; className: string }> = {
      positive: { emoji: '🌟', label: 'Feeling Great', className: 'emotion-positive' },
      sad: { emoji: '💙', label: 'Here for you', className: 'emotion-sad' },
      stressed: { emoji: '🫂', label: 'Let\'s manage this', className: 'emotion-stressed' },
      frustrated: { emoji: '💪', label: 'We\'ll figure it out', className: 'emotion-frustrated' },
      fearful: { emoji: '🤗', label: 'You\'re safe here', className: 'emotion-fearful' },
      lonely: { emoji: '🤝', label: 'You\'re not alone', className: 'emotion-lonely' },
      unmotivated: { emoji: '🔥', label: 'Let\'s spark it', className: 'emotion-unmotivated' },
    }
    return badges[emotion] || null
  }

  const formatMessage = (content: string) => {
    // Convert **bold** and basic markdown
    return content.split('\n').map((line, i) => {
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/• /g, '&bull; ')
      return <p key={i} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
    })
  }

  return (
    <div className="counselor-page">
      {/* Header */}
      <header className="counselor-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="counselor-identity">
            <div className="counselor-avatar">
              <Brain size={24} />
            </div>
            <div>
              <h1>AI Academic Counselor</h1>
              <span className="status-online">● Online — here to help</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-badges">
            <span className="badge badge-academic"><BookOpen size={14} /> Academics</span>
            <span className="badge badge-wellness"><Heart size={14} /> Wellness</span>
            <span className="badge badge-ai"><Sparkles size={14} /> AI-Powered</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-list">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className="message-bubble-group">
                <div className={`message-bubble ${msg.role}`}>
                  <div className="message-content">{formatMessage(msg.content)}</div>
                </div>

                {/* Emotion Badge */}
                {msg.emotion && getEmotionBadge(msg.emotion) && (
                  <div className={`emotion-badge ${getEmotionBadge(msg.emotion)!.className}`}>
                    <span>{getEmotionBadge(msg.emotion)!.emoji}</span>
                    <span>{getEmotionBadge(msg.emotion)!.label}</span>
                  </div>
                )}

                {/* Suggested Actions */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="suggested-actions">
                    <span className="actions-label">💡 Suggested Actions:</span>
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        className="action-chip"
                        onClick={() => sendMessage(action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Encouragement */}
                {msg.encouragement && (
                  <div className="encouragement">
                    <Sparkles size={14} />
                    <span>{msg.encouragement}</span>
                  </div>
                )}

                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="message-wrapper assistant">
              <div className="message-avatar"><Bot size={20} /></div>
              <div className="message-bubble-group">
                <div className="message-bubble assistant">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {showQuickPrompts && messages.length <= 1 && (
        <div className="quick-prompts">
          <p className="prompts-label">Quick topics:</p>
          <div className="prompts-grid">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className={`prompt-chip ${prompt.category}`}
                onClick={() => sendMessage(prompt.text)}
              >
                <span>{prompt.icon}</span>
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (academics, feelings, anything!)"
            rows={1}
            disabled={loading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="send-btn"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="input-hint">
          Your conversations are private and encrypted. Press Enter to send, Shift+Enter for new line.
        </p>
      </form>
    </div>
  )
}
