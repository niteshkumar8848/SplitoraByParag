import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import { sendChatMessage } from '../../api/chatbot.api'
import useAuth from '../../hooks/useAuth'

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Hi! I'm your **Splitora AI Assistant**, powered by Claude!

Here's what I can do:
• 📊 **View** your groups, expenses & balances
• ➕ **Create** new groups and add expenses
• 💰 **Calculate** who owes whom
• 📈 **Analyze** your spending patterns
• ❓ **Answer** questions about Splitora

What would you like to do today?`,
  timestamp: new Date()
}

const QUICK_ACTIONS = [
  { label: '📊 My Groups', message: 'Show me all my groups' },
  { label: '💰 My Balances', message: 'What are my current balances across all groups?' },
  { label: '📈 This Month', message: 'How much have I spent this month?' },
  { label: '❓ Help', message: 'What can you help me with?' }
]

export default function Chatbot() {
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  // Don't render if not authenticated
  if (!isAuthenticated) return null

  const getConversationHistory = () =>
    messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }))

  const sendMessage = async (messageText) => {
    const text = (messageText || input).trim()
    if (!text || isLoading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setShowQuickActions(false)

    try {
      const history = getConversationHistory()
      const response = await sendChatMessage(text, history)

      const replyText =
        response?.data?.message ||
        response?.message ||
        'Sorry, I could not process that. Please try again.'

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: new Date()
        }
      ])
    } catch (err) {
      const errorText =
        err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.'
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ ${errorText}`,
          timestamp: new Date()
        }
      ])
      toast.error(errorText)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE])
    setShowQuickActions(true)
  }

  const toggleOpen = () => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }

  return (
    <>
      {/* ── Floating action button ── */}
      <button
        id="chatbot-toggle-btn"
        onClick={toggleOpen}
        aria-label="Open Splitora AI Assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-2xl transition-all duration-300 hover:bg-primary-700 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary-300"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <>
            <MessageCircle size={22} />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white shadow">
              AI
            </span>
          </>
        )}
      </button>

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          id="chatbot-window"
          className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl border border-surface-200 dark:border-dark-50 bg-white dark:bg-dark-100 shadow-2xl transition-all duration-300"
          style={{
            width: '24rem',
            height: isMinimized ? '3.5rem' : '600px',
            maxHeight: 'calc(100vh - 120px)'
          }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between rounded-t-2xl bg-primary-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Splitora AI</p>
                <p className="text-[10px] text-primary-200 leading-tight">Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsMinimized((p) => !p)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body — hidden when minimized */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-dark-100">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600">
                        <Bot size={13} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-tr-sm bg-primary-600 text-white'
                          : 'rounded-tl-sm bg-surface-100 dark:bg-dark-50 text-surface-900 dark:text-slate-100'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 prose-strong:text-surface-900 dark:prose-strong:text-white dark:prose-p:text-slate-100 dark:prose-li:text-slate-100">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.role === 'user' ? 'text-primary-200' : 'text-surface-400 dark:text-slate-500'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {msg.role === 'user' && (
                      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-200 dark:bg-dark-50 text-surface-600 dark:text-slate-300">
                        <User size={13} />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600">
                      <Bot size={13} />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-surface-100 dark:bg-dark-50 px-4 py-3">
                      <div className="flex gap-1 items-center h-3">
                        <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick action chips */}
                {showQuickActions && messages.length === 1 && !isLoading && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        className="rounded-xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 px-3 py-2 text-left text-xs font-medium text-surface-700 dark:text-slate-200 transition hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-surface-200 dark:border-dark-50 p-3 bg-white dark:bg-dark-100">
                <div className="flex items-end gap-2 rounded-xl border border-surface-300 dark:border-dark-50 bg-surface-50 dark:bg-dark-50 px-3 py-2 transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-primary-800">
                  <textarea
                    ref={inputRef}
                    id="chatbot-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your expenses…"
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-transparent text-sm text-surface-900 dark:text-slate-100 placeholder:text-surface-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                    style={{ maxHeight: '80px' }}
                  />
                  <button
                    id="chatbot-send-btn"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-surface-400 dark:text-slate-500">
                  Powered by Claude · Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
