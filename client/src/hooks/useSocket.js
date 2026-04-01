import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
<<<<<<< HEAD
import { API_ORIGIN as SOCKET_URL } from '../config/api'
=======

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '')
>>>>>>> 29ca58f (SignIn with google added)

export default function useSocket(groupId) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!groupId) return
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('join-group', groupId))
    socket.on('expense-added', () => { queryClient.invalidateQueries({ queryKey: ['group', groupId] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }) })
    socket.on('expense-deleted', () => { queryClient.invalidateQueries({ queryKey: ['group', groupId] }) })
    socket.on('settlement-confirmed', () => { queryClient.invalidateQueries({ queryKey: ['settlement-suggestions', groupId] }); queryClient.invalidateQueries({ queryKey: ['settlements', groupId] }) })
    socket.on('member-added', () => { queryClient.invalidateQueries({ queryKey: ['group', groupId] }); queryClient.invalidateQueries({ queryKey: ['groups'] }) })
    return () => { socket.emit('leave-group', groupId); socket.disconnect() }
  }, [groupId, queryClient])
}
