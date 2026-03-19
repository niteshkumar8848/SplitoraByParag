import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmSettlement,
  getGroupSettlements,
  getSettlementSuggestions,
} from "../api/settlements.api";

export function useSettlementSuggestions(groupId) {
  return useQuery({
    queryKey: ["settlement-suggestions", groupId],
    queryFn: () => getSettlementSuggestions(groupId),
    enabled: Boolean(groupId),
  });
}

export function useGroupSettlements(groupId) {
  return useQuery({
    queryKey: ["settlements", groupId],
    queryFn: () => getGroupSettlements(groupId),
    enabled: Boolean(groupId),
  });
}

export function useConfirmSettlement(groupId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement-suggestions", groupId] });
      queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export default function useSettlements({ groupId } = {}) {
  const suggestionsQuery = useSettlementSuggestions(groupId);
  const settlementsQuery = useGroupSettlements(groupId);
  const confirmSettlementMutation = useConfirmSettlement(groupId);

  return {
    suggestionsQuery,
    settlementsQuery,
    confirmSettlementMutation,
  };
}