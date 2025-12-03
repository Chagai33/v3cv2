import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { birthdayService } from '../services/birthday.service';
import { BirthdayFormData, Birthday } from '../types';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ensureTokenWithClaims } from '../utils/tokenRefresh';

export const useBirthdays = (includeArchived = false) => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['birthdays', currentTenant?.id, includeArchived],
    queryFn: async () => {
      if (!currentTenant) return [];
      return await birthdayService.getTenantBirthdays(currentTenant.id, includeArchived);
    },
    enabled: !!currentTenant,
  });
};

export const useUpcomingBirthdays = (days: number = 30) => {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['upcomingBirthdays', currentTenant?.id, days],
    queryFn: async () => {
      if (!currentTenant) return [];
      return await birthdayService.getUpcomingBirthdays(currentTenant.id, days);
    },
    enabled: !!currentTenant,
  });
};

export const useBirthday = (birthdayId: string | null) => {
  return useQuery({
    queryKey: ['birthday', birthdayId],
    queryFn: async () => {
      if (!birthdayId) return null;
      return await birthdayService.getBirthday(birthdayId);
    },
    enabled: !!birthdayId,
  });
};

export const useCreateBirthday = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BirthdayFormData) => {
      if (!currentTenant || !user) throw new Error('No tenant or user');

      const hasValidToken = await ensureTokenWithClaims();
      if (!hasValidToken) {
        throw new Error('Authentication token is not ready. Please wait a moment and try again.');
      }

      return await birthdayService.createBirthday(currentTenant.id, data, user.id);
    },
    onSuccess: () => {
      // Invalidate כדי לעדכן את הרשימה עם הרשומה החדשה
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });

      // Refetch חד-פעמי אחרי 3 שניות (כשהחישוב אמור להסתיים)
      // הערה: timeout זה לא מתנקה אם הקומפוננטה נסגרת, אבל זה לא קריטי כי זה רק 2 timeouts קצרים
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['birthdays', currentTenant?.id] });
      }, 3000);

      // Refetch נוסף אחרי 8 שניות (למקרה שהחישוב לוקח יותר זמן)
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['birthdays', currentTenant?.id] });
      }, 8000);
    },
  });
};

export const useUpdateBirthday = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      birthdayId,
      data,
    }: {
      birthdayId: string;
      data: Partial<BirthdayFormData>;
    }) => {
      if (!user) throw new Error('No user');
      return await birthdayService.updateBirthday(birthdayId, data, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
      queryClient.invalidateQueries({ queryKey: ['birthday'] });
    },
  });
};

export const useDeleteBirthday = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async (birthdayId: string) => {
      return await birthdayService.deleteBirthday(birthdayId);
    },
    // Optimistic Update - עדכון מיידי של ה-cache
    onMutate: async (birthdayId: string) => {
      // ביטול כל ה-queries הרלוונטיים כדי למנוע race conditions
      await queryClient.cancelQueries({ queryKey: ['birthdays'] });
      await queryClient.cancelQueries({ queryKey: ['upcomingBirthdays'] });
      await queryClient.cancelQueries({ queryKey: ['birthday'] });

      // שמירת המצב הקודם למקרה של rollback
      const previousBirthdays = queryClient.getQueryData<Birthday[]>([
        'birthdays',
        currentTenant?.id,
        false,
      ]);
      const previousArchived = queryClient.getQueryData<Birthday[]>([
        'birthdays',
        currentTenant?.id,
        true,
      ]);

      // עדכון ה-cache - הסרת הרשומה שנמחקה מכל ה-queries הרלוונטיים
      // עדכון birthdays (לא archived)
      queryClient.setQueryData<Birthday[]>(
        ['birthdays', currentTenant?.id, false],
        (old) => (old ? old.filter((b) => b.id !== birthdayId) : [])
      );

      // עדכון birthdays (archived)
      queryClient.setQueryData<Birthday[]>(
        ['birthdays', currentTenant?.id, true],
        (old) => (old ? old.filter((b) => b.id !== birthdayId) : [])
      );

      // עדכון upcomingBirthdays - צריך לעדכן את כל ה-queries עם days שונים
      // נשתמש ב-setQueriesData כדי לעדכן את כל ה-queries עם prefix
      queryClient.setQueriesData<Birthday[]>(
        { queryKey: ['upcomingBirthdays', currentTenant?.id] },
        (old) => (old ? old.filter((b) => b.id !== birthdayId) : [])
      );

      // עדכון birthday query ספציפי (אם קיים)
      queryClient.setQueryData(['birthday', birthdayId], null);

      return { previousBirthdays, previousArchived };
    },
    // במקרה של שגיאה - rollback למצב הקודם
    onError: (err, birthdayId, context) => {
      if (context?.previousBirthdays) {
        queryClient.setQueryData(
          ['birthdays', currentTenant?.id, false],
          context.previousBirthdays
        );
      }
      if (context?.previousArchived) {
        queryClient.setQueryData(
          ['birthdays', currentTenant?.id, true],
          context.previousArchived
        );
      }
      // עבור upcomingBirthdays, נסמן כ-stale במקום rollback (יותר בטוח)
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
    },
    // אחרי הצלחה - רק מסמן את ה-queries כ-stale (לא refetch)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
      queryClient.invalidateQueries({ queryKey: ['birthday'] });
    },
  });
};

export const useCheckDuplicates = () => {
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async ({
      groupIds, // Changed from groupId
      firstName,
      lastName,
      birthDate,
    }: {
      groupIds?: string[]; // Changed from groupId
      firstName: string;
      lastName: string;
      birthDate: string | Date;
    }) => {
      if (!currentTenant) throw new Error('No tenant');
      return await birthdayService.checkDuplicates(
        currentTenant.id,
        groupIds,
        firstName,
        lastName,
        birthDate
      );
    },
  });
};

export const useRefreshHebrewData = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: async (birthdayId: string) => {
      if (!currentTenant) throw new Error('No tenant');

      const functions = getFunctions();
      const refreshFunction = httpsCallable(functions, 'refreshBirthdayHebrewData');

      const result = await refreshFunction({
        birthdayId,
        tenantId: currentTenant.id,
      });

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });
      queryClient.invalidateQueries({ queryKey: ['birthday'] });
    },
  });
};
