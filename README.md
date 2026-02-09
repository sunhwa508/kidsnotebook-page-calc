# kidsnotebook-page-calc

키즈노트북 페이지 계산 CLI. 알림장/앨범 데이터를 입력받아 총 페이지 수를 계산합니다.

## 설치 (git submodule)

```bash
git submodule add https://github.com/sunhwa508/kidsnotebook-page-calc.git
```

## 사용법

```bash
# JSON 파일 입력
node kidsnotebook-page-calc/dist/cli.js input.json

# stdin 입력
cat input.json | node kidsnotebook-page-calc/dist/cli.js

# 파이프라인 예시
echo '{"reports":[], "albums":[]}' | node kidsnotebook-page-calc/dist/cli.js
```

## 입력 형식 (JSON)

```jsonc
{
  "reports": [],    // WorkspaceReport[] (필수)
  "albums": [],     // WorkspaceAlbum[] (필수)
  "hiddenIds": [],  // string[] (선택) - 숨김 처리할 아이템 ID 목록
  "filter": {}      // FilterSettings (선택) - 필터 설정
}
```

### filter 옵션

| 필드 | 타입 | 설명 |
|------|------|------|
| `excludeAlbum` | `boolean` | 앨범 전체 제외 |
| `excludeReport` | `boolean` | 알림장 전체 제외 |
| `excludeHomeReport` | `boolean` | 가정에서 원으로 알림장 제외 (`is_sent_from_center: false`) |
| `excludeNoPhotoReport` | `boolean` | 사진 없는 알림장 제외 |
| `excludeComment` | `boolean` | 알림장 댓글 제외 |

### is_selected 처리

각 항목의 `is_selected: false`는 자동으로 페이지 계산에서 제외됩니다.

- 알림장 `is_selected: false` → 해당 알림장의 텍스트, 이미지, 댓글 모두 제외
- 앨범 `is_selected: false` → 해당 앨범의 이미지 모두 제외
- 개별 이미지/댓글 `is_selected: false` → 해당 항목만 제외

## 출력 형식

```json
{
  "totalPages": 42,
  "innerPages": 35,
  "startDate": "2024-01-15",
  "endDate": "2024-12-20"
}
```

| 필드 | 설명 |
|------|------|
| `totalPages` | 총 페이지 수 (표지 + 목차 + 섹션커버 + 내지 + 아웃트로) |
| `innerPages` | 내지 페이지 수 |
| `startDate` | 가장 빠른 콘텐츠 날짜 |
| `endDate` | 가장 늦은 콘텐츠 날짜 |

## 페이지 계산 공식

```
총 페이지 = 표지(1) + 목차 + 섹션커버(월 수) + 내지(N) + 아웃트로(1)

목차 = ceil(알림장 월 수 / 7) + ceil(앨범 월 수 / 7)
```

## 입력 데이터 상세 타입

### WorkspaceReport

```typescript
{
  id: number;
  type: "report";
  yearmonth: string;           // "202401"
  created: string;             // ISO 8601 datetime
  title: string;
  content: string;             // 알림장 본문
  author: { id: number | null, name: string };
  is_selected: boolean;
  is_sent_from_center: boolean; // true: 원→가정, false: 가정→원
  weather: string;
  life_log: {
    mood_status: string;
    health_status: string;
    temperature_status: string;
    meal_status: string;
    sleep_hour: string;
  };
  comments: [{
    id: number;
    text: string;
    author: { id: number | null, name: string };
    created_at: string;
    is_selected: boolean;
  }];
  images: [{
    url?: string;
    access_key?: string;
    width: number;
    height: number;
    is_selected: boolean;
  }];
  videos: [{
    access_key: string;
    width: number;
    height: number;
    is_selected: boolean;
  }];
}
```

### WorkspaceAlbum

```typescript
{
  id: number;
  type: "album";
  yearmonth: string;
  created: string;
  title: string;
  author_name: string;
  is_selected: boolean;
  images: [{
    url?: string;
    access_key?: string;
    width: number;
    height: number;
    is_selected: boolean;
  }];
  videos: [{
    access_key: string;
    width: number;
    height: number;
    is_selected: boolean;
  }];
}
```

## 전체 입력 예시

```json
{
  "reports": [
    {
      "id": 1,
      "type": "report",
      "yearmonth": "202401",
      "created": "2024-01-15T10:00:00+09:00",
      "title": "",
      "content": "오늘 아이가 즐겁게 놀았습니다.",
      "author": { "id": 1, "name": "김선생" },
      "is_selected": true,
      "is_sent_from_center": true,
      "weather": "맑음",
      "life_log": {
        "mood_status": "좋음",
        "health_status": "건강",
        "temperature_status": "36.5",
        "meal_status": "잘 먹음",
        "sleep_hour": "2시간"
      },
      "comments": [
        {
          "id": 1,
          "text": "감사합니다!",
          "author": { "id": 2, "name": "학부모" },
          "created_at": "2024-01-15T18:00:00+09:00",
          "is_selected": true
        }
      ],
      "images": [
        { "url": "https://example.com/img1.jpg", "width": 800, "height": 600, "is_selected": true }
      ],
      "videos": []
    }
  ],
  "albums": [
    {
      "id": 10,
      "type": "album",
      "yearmonth": "202401",
      "created": "2024-01-20T14:00:00+09:00",
      "title": "1월 활동 앨범",
      "author_name": "김선생",
      "is_selected": true,
      "images": [
        { "url": "https://example.com/album1.jpg", "width": 1024, "height": 768, "is_selected": true }
      ],
      "videos": []
    }
  ],
  "filter": {
    "excludeHomeReport": true
  }
}
```

실행:

```bash
node kidsnotebook-page-calc/dist/cli.js example.json
```

출력:

```json
{
  "totalPages": 7,
  "innerPages": 2,
  "startDate": "2024-01-15",
  "endDate": "2024-01-20"
}
```
