import { useInfiniteQuery } from '@tanstack/react-query';
import { getDecks } from '@/app/actions/deck';
import { useTranslations } from 'next-intl';

export function useInfiniteDecks(pageSize: number = 24) {
  const t = useTranslations('Deck.list');
  return useInfiniteQuery({
    queryKey: ['decks', 'infinite'],
    queryFn: async ({ pageParam }) => {
      const response = await getDecks(pageParam, pageSize);
      // 서버 액션이 success:false로 응답했을 때 React Query가 에러로 인지하도록 throw
      // (그렇지 않으면 UI가 빈 상태로 잘못 폴백되어 "아직 생성된 덱이 없습니다"가 표시됨)
      if (!response.success) {
        throw new Error(response.message || t('fetchFailed'));
      }
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.page || !lastPage.totalPages) return undefined;
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
  });
}

