# actionWithToast 사용 가이드

`actionWithToast`는 서버 액션을 실행하고 결과 메시지를 자동으로 toast로 표시하는 헬퍼 함수입니다.

## 기본 사용법

### 1. 간단한 서버 액션 호출

```tsx
import { actionWithToast } from "@/lib/action-with-toast";
import { createDeck } from "@/app/actions/deck";

async function handleSubmit() {
  const result = await actionWithToast(() => createDeck(formData));
  
  if (result.success) {
    // 성공 시 추가 처리
    router.push('/decks');
  }
}
```

- 성공 시 `toast.success(result.message)` 자동 표시
- 실패 시 `toast.error(result.message)` 자동 표시
- `fieldErrors`가 있으면 필드별 에러도 함께 표시

### 2. 옵션을 사용한 호출

#### 에러만 표시하기 (성공 메시지 숨김)

```tsx
const result = await actionWithToast(
  () => uploadDeckThumbnail(file, deckId),
  { showOnlyError: true }
);
```

#### 성공 메시지만 표시하기 (에러 숨김)

```tsx
const result = await actionWithToast(
  () => getDeck(deckId),
  { showOnlySuccess: true }
);
```

#### Toast를 전혀 표시하지 않기

```tsx
const result = await actionWithToast(
  () => getDeck(deckId),
  { showToast: false }
);
```

## 실제 사용 예시

### 예시 1: 덱 삭제

```tsx
// components/decks/DeleteDeckDialog.tsx
async function handleDelete() {
  setIsLoading(true);
  
  try {
    await actionWithToast(() => deleteDeck(deck.id));
    // deleteDeck은 성공하면 redirect를 호출하므로, 여기까지 오지 않습니다
    setOpen(false);
  } finally {
    setIsLoading(false);
  }
}
```

### 예시 2: 이미지 업로드 (에러만 표시)

```tsx
// components/decks/DeckDialog.tsx
const uploadResponse = await actionWithToast(
  () => uploadDeckThumbnail(selectedFile, deck.id),
  { showOnlyError: true }  // 성공 메시지는 숨기고 에러만 표시
);

if (!uploadResponse.success || !uploadResponse.data) {
  throw new Error(uploadResponse.message);
}

const thumbnailUrl = uploadResponse.data;
```

### 예시 3: 복합 작업 (생성 + 업로드 + 수정)

```tsx
// 생성 모드: 먼저 덱을 생성한 후 이미지 업로드
const createResponse = await actionWithToast(
  () => createDeck(formData),
  { showOnlyError: true }
);

if (createResponse.success && createResponse.data) {
  const uploadResponse = await actionWithToast(
    () => uploadDeckThumbnail(selectedFile, createResponse.data.id),
    { showOnlyError: true }
  );
  
  if (uploadResponse.success && uploadResponse.data) {
    const updateResponse = await actionWithToast(
      () => updateDeck(createResponse.data.id, updateFormData)
    );
    // 마지막 updateDeck의 성공 메시지만 표시됨
  }
}
```

## 옵션 참고

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `showToast` | boolean | true | toast를 표시할지 여부 |
| `showOnlySuccess` | boolean | false | 성공 시에만 toast를 표시 |
| `showOnlyError` | boolean | false | 실패 시에만 toast를 표시 |

## 주의사항

1. **`"use client"` 필수**: `actionWithToast`는 클라이언트 컴포넌트에서만 사용할 수 있습니다.

2. **에러 처리**: `actionWithToast`는 예상치 못한 에러도 자동으로 처리하여 toast로 표시합니다.

3. **필드 에러**: 서버 액션이 `fieldErrors`를 반환하면 자동으로 toast에 포함됩니다.

4. **redirect 처리**: 서버 액션 내부에서 `redirect()`를 호출하면 함수가 즉시 종료되므로, toast가 표시되지 않을 수 있습니다.

## 기존 코드 마이그레이션

### Before

```tsx
try {
  const response = await deleteDeck(deck.id);
  if (!response.success) {
    throw new Error(response.message);
  }
  toast.success("덱이 성공적으로 삭제되었습니다!");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "덱 삭제에 실패했습니다.");
}
```

### After

```tsx
await actionWithToast(() => deleteDeck(deck.id));
```

훨씬 간결하고 일관된 에러 처리가 가능합니다!

