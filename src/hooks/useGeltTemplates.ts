import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geltTemplatesService } from '../services/geltTemplates.service';
import { AgeGroup, BudgetConfig } from '../types/gelt';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

export const useGeltTemplates = () => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['geltTemplates', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) {
        return [];
      }
      return await geltTemplatesService.getTemplates(currentTenant.id);
    },
    enabled: !!currentTenant,
    retry: 1,
  });
};

export const useGeltTemplate = (templateId: string | null) => {
  return useQuery({
    queryKey: ['geltTemplate', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      return await geltTemplatesService.getTemplate(templateId);
    },
    enabled: !!templateId,
  });
};

export const useDefaultGeltTemplate = () => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['defaultGeltTemplate', currentTenant?.id],
    queryFn: async () => {
      console.log('[useDefaultGeltTemplate] currentTenant?.id:', currentTenant?.id);
      if (!currentTenant) {
        console.log('[useDefaultGeltTemplate] No currentTenant, returning null');
        return null;
      }
      const result = await geltTemplatesService.getDefaultTemplate(currentTenant.id);
      console.log('[useDefaultGeltTemplate] Result from service:', result ? `Found: ${result.name}` : 'null');
      return result;
    },
    enabled: !!currentTenant,
  });
};

export const useSaveGeltTemplate = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      ageGroups: AgeGroup[];
      budgetConfig: BudgetConfig;
      customGroupSettings: AgeGroup[] | null;
      is_default?: boolean;
    }) => {
      if (!currentTenant || !user) throw new Error('No tenant or user');
      return await geltTemplatesService.saveTemplate(
        currentTenant.id,
        template,
        user.id
      );
    },
    onSuccess: async () => {
      // Invalidate and refetch templates immediately
      await queryClient.invalidateQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
      await queryClient.invalidateQueries({ queryKey: ['defaultGeltTemplate', currentTenant?.id] });
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
    },
  });
};

export const useUpdateGeltTemplate = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      templateId,
      template,
    }: {
      templateId: string;
      template: Partial<{
        name: string;
        description?: string;
        ageGroups: AgeGroup[];
        budgetConfig: BudgetConfig;
        customGroupSettings: AgeGroup[] | null;
        is_default?: boolean;
      }>;
    }) => {
      if (!user) throw new Error('No user');
      return await geltTemplatesService.updateTemplate(templateId, template, user.id);
    },
    onSuccess: async () => {
      // Invalidate and refetch templates immediately
      await queryClient.invalidateQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
      await queryClient.invalidateQueries({ queryKey: ['defaultGeltTemplate', currentTenant?.id] });
      await queryClient.invalidateQueries({ queryKey: ['geltTemplate'] });
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
    },
  });
};

export const useDeleteGeltTemplate = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async (templateId: string) => {
      return await geltTemplatesService.deleteTemplate(templateId);
    },
    onSuccess: async () => {
      // Invalidate and refetch templates immediately
      await queryClient.invalidateQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
      await queryClient.invalidateQueries({ queryKey: ['defaultGeltTemplate', currentTenant?.id] });
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['geltTemplates', currentTenant?.id] });
    },
  });
};
