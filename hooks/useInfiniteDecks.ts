import { useInfiniteQuery } from '@tanstack/react-query';
import { getDecks } from '@/app/actions/deck';

export function useInfiniteDecks(pageSize: number = 24) {
  return useInfiniteQuery({
    queryKey: ['decks', 'infinite'],
    queryFn: ({ pageParam }) => getDecks(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.page || !lastPage.totalPages) return undefined;
      return lastPage.page < lastPage.totalPages 
        ? lastPage.page + 1 
        : undefined;
    },
  });
}

