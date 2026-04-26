export const AI_DECK_IMPORT_PROMPT = `다음 조건으로 워들 덱을 만들어 아래 JSON 스키마로만 응답해주세요. 설명/잡담/사과/머리말/꼬리말 모두 금지. JSON 코드블록만.

조건:
- words 배열의 word는 반드시 영어 소문자 a-z만 사용 (공백/숫자/특수문자/대문자 금지).
- categories 항목도 반드시 영어 소문자 사용 (공백 대신 하이픈 - 사용 권장).
- 단어 20~30개, 의미 있는 카테고리 2~5개 권장.

스키마:
\`\`\`json
{
  "name": "덱 이름 (한국어 가능)",
  "description": "한 줄 설명 (한국어 가능)",
  "categories": ["category1", "category2"],
  "words": [
    { "word": "apple", "tags": ["category1"] },
    { "word": "banana", "tags": ["category1", "category2"] }
  ]
}
\`\`\`

규칙:
- words[].tags는 반드시 categories 안의 값만 사용.
- 카테고리가 필요 없는 주제면 categories와 모든 tags를 빈 배열로.
- 응답 전체는 \`\`\`json ... \`\`\` 코드블록 1개만, 그 외 어떠한 텍스트도 포함하지 말 것.
- 위 규칙을 어겼다면 다시 생성해 출력하기 전에 스스로 점검할 것.

주제: (여기에 원하는 주제를 적어 LLM에 전달)
`;
