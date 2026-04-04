import api from './axios'

/**
 * Send a chat message to the Splitora AI Assistant.
 * @param {string} message - The user's message
 * @param {Array<{role: string, content: string}>} messages - Prior conversation history
 */
export const sendChatMessage = async (message, messages = []) => {
  const response = await api.post('/chatbot/chat', {
    message,
    messages: messages.slice(-10)
  })
  return response.data
}
