
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geltService } from '../services/gelt.service';
import { GeltState } from '../types/gelt';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_AGE_GROUPS, DEFAULT_BUDGET_CONFIG } from '../utils/geltConstants';

const emptyCalculation = {
  totalRequired: 0,
  amountPerParticipant: 0,
  maxAllowed: 0,
  groupTotals: {},
};

const defaultState: GeltState = {
  children: [],
  ageGroups: DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
  budgetConfig: { ...DEFAULT_BUDGET_CONFIG },
  calculation: emptyCalculation,
  customGroupSettings: null,
  includedChildren: [],
};

export const useGelt = () => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['gelt', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return defaultState;
      const state = await geltService.getGeltState(currentTenant.id);
      return state || defaultState;
    },
    enabled: !!currentTenant,
  });
};

export const useUpdateGelt = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (state: GeltState) => {
      if (!currentTenant || !user) throw new Error('No tenant or user');
      return await geltService.saveGeltState(currentTenant.id, state, user.id);
    },
    onSuccess: () => {
      // Don't invalidate queries after auto-save to prevent resetting local state
      // The local state is the source of truth during the session
      // queryClient.invalidateQueries({ queryKey: ['gelt', currentTenant?.id] });
    },
  });
};

export const useResetGelt = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentTenant || !user) throw new Error('No tenant or user');
      return await geltService.resetGeltState(currentTenant.id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gelt', currentTenant?.id] });
    },
  });
};
