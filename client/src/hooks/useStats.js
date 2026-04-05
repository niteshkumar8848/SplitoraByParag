import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getMyTransactions } from '../api/stats.api'

export function useDashboardStats() {
  return useQuery({ queryKey: ['stats', 'dashboard'], queryFn: getDashboardStats, staleTime: 30000 })
}

export function useMyTransactions() {
  return useQuery({ queryKey: ['stats', 'transactions'], queryFn: getMyTransactions, staleTime: 30000 })
}
