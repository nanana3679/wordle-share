# 덱 목록 페이지 좋아요 기능 흐름

interface DeckWithLikes extends Deck {
  likeCount: number;
  isLiked: boolean;
}

getDecks(queryKey, userId?)

- const [likeState, setLikeState] = useState({
    likes: initialLikes,
    isLiked: initialIsLiked,
  });

  const [optimisticState, addOptimisticState] = useOptimistic(
    likeState,
    // 실제 상태, addOptimisticState(가짜 상태 업데이트)의 인자
    (currentState, optimisticUpdate) => {
      const action = optimisticUpdate.action;

      if (action === "LIKE") {
        return { likes: currentState.likes + 1, isLiked: true };
      } else if (action === "DISLIKE") {
        return { likes: currentState.likes - 1, isLiked: false };
      }
      return currentState;
    }
  );

  const handleLike = async () => {
    const newIsLiked = !optimisticState.isLiked;
    const action = newIsLiked ? "LIKE" : "DISLIKE";

    // 1. 낙관적 업데이트: UI를 즉시 변경
    addOptimisticState({ action: action });
    
    try {
      // 2. 서버에 요청 전송
      await updateLikeStatus(postId, newIsLiked);

      // 3. 서버 요청 성공: 실제 상태를 업데이트하여 낙관적 상태를 최종 상태로 확정
      // startTransition을 사용하여 상태 업데이트가 UI 블로킹을 일으키지 않도록 합니다.
      startTransition(() => {
        setState({ likes: optimisticState.likes, isLiked: newIsLiked });
      });

    } catch (error) {
      // 4. 서버 요청 실패: 실제 상태가 변경되지 않았으므로
      // useOptimistic이 자동으로 낙관적 상태를 **초기 상태 (state)**로 롤백합니다.
      console.error(error.message);
      // 사용자에게 실패 알림 등을 추가할 수 있습니다.
      alert("좋아요 처리 실패: " + error.message); 
      
      // setState 호출이 없어도, useOptimistic의 내부 메커니즘이 
      // 비동기 작업(updateLikeStatus)이 끝났을 때 현재의 'state' 값으로 
      // 'optimisticState'를 재설정합니다.
    }
  };

- likeCount, isLiked (optimistically update)
- toggleLike(deck.id)
  - if (isLiked) {
    setIsLiked(false)
    setLikeCount(prev => prev - 1)
    startTransition(() => {
      deleteLike(deck.id)
    })
  } else {
    setIsLiked(true)
    setLikeCount(prev => prev + 1)
    startTransition(() => {
      createLike(deck.id)
    })
  }