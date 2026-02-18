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

### is_day_selected / is_selected 처리

선택 상태에 따라 페이지 계산에서 자동 제외됩니다.

**`is_day_selected`** — 날짜 단위 제외 (알림장/앨범 객체에 존재)

- `is_day_selected: false` → 해당 날짜의 알림장 또는 앨범 **전체**가 페이지 계산에서 제외됨
- `is_day_selected`가 없거나 `true`이면 정상 포함
- 같은 날짜에 여러 알림장/앨범이 있어도 개별 판단

**`is_selected`** — 항목 단위 제외

- 알림장 `is_selected: false` → 해당 알림장의 텍스트, 이미지, 댓글 모두 제외
- 앨범 `is_selected: false` → 해당 앨범의 이미지 모두 제외
- 개별 이미지/댓글 `is_selected: false` → 해당 항목만 제외

**적용 우선순위**: `is_day_selected: false`이면 `is_selected` 값과 무관하게 통째로 제외됨

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
  is_day_selected?: boolean;    // false면 해당 날짜 알림장 전체 제외
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
  is_day_selected?: boolean;  // false면 해당 날짜 앨범 전체 제외
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

---

## 백엔드 API 통합 가이드

### 배경

프론트엔드(kidsnote-web-store)와 백엔드(silver-bullet)의 페이지 계산 결과가 반드시 일치해야 합니다.
장바구니에 키즈노트북을 담을 때, 프론트에서 계산한 페이지 수와 백엔드에서 계산한 페이지 수가 다르면 가격 불일치가 발생할 수 있습니다.

### 텍스트 너비 측정 방식 (2026-02-18 변경)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 방식 | 비율 추정 (한글=1.0, ASCII=0.6) | Pretendard 폰트 너비 테이블 (브라우저 Canvas 측정값) |
| 한글 너비 | `fontSize * 1.0` (과대 추정 13.6%) | `12.099609375 * (fontSize / 14)` |
| ASCII | `fontSize * 0.6` (균일) | 글자별 실제 너비 (95개 개별 값) |
| 결과 | 283페이지 (과다 계산) | **277페이지** (프론트와 일치) |

변경 파일: `src/textLayout.ts` (`measureTextWidth` 함수)

### 장바구니 API에서 페이지 검증

프론트에서 cart에 JSON 데이터와 pages를 함께 전송합니다.
백엔드에서 200 응답 전에 페이지 수를 검증하는 플로우:

```
클라이언트 → POST /v1/carts/
{
  "product_id": 30,
  "pages": 277,                          ← 프론트 계산값
  "data": { "reports": [...], "albums": [...] }  ← 원본 데이터
}
    ↓
백엔드: data를 CLI에 넘겨서 자체 페이지 계산
    ↓
프론트 pages === 백엔드 계산값?
  → 일치: 200 OK (cart 생성)
  → 불일치: 400 Bad Request
```

### Python 연동 코드

```python
import subprocess
import json

def verify_page_count(cart_data: dict, claimed_pages: int) -> dict:
    """
    프론트가 보낸 페이지 수를 백엔드에서 검증합니다.

    Args:
        cart_data: 프론트가 보낸 JSON (reports, albums 포함)
        claimed_pages: 프론트가 주장하는 총 페이지 수

    Returns:
        {"valid": True/False, "calculated": int, "claimed": int}
    """
    result = subprocess.run(
        ['node', 'kidsnotebook-page-calc/dist/cli.js'],
        input=json.dumps(cart_data),
        capture_output=True,
        text=True,
        timeout=10,  # 10초 타임아웃
    )

    if result.returncode != 0:
        raise RuntimeError(f"Page calc failed: {result.stderr}")

    calc = json.loads(result.stdout)
    calculated_pages = calc['totalPages']

    return {
        "valid": calculated_pages == claimed_pages,
        "calculated": calculated_pages,
        "claimed": claimed_pages,
    }
```

### Django View 적용 예시

```python
from rest_framework.response import Response
from rest_framework import status

class CartViewSet(viewsets.ModelViewSet):
    def create(self, request):
        claimed_pages = request.data.get('pages')
        cart_data = request.data.get('data')

        if claimed_pages is not None and cart_data is not None:
            result = verify_page_count(cart_data, claimed_pages)
            if not result['valid']:
                return Response(
                    {
                        "error": "page_mismatch",
                        "message": f"페이지 수 불일치: 요청={result['claimed']}, 계산={result['calculated']}",
                        "calculated_pages": result['calculated'],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # 페이지 수 일치 → cart 생성 진행
        # ...
```

### 에러 응답 예시

```json
{
  "error": "page_mismatch",
  "message": "페이지 수 불일치: 요청=280, 계산=277",
  "calculated_pages": 277
}
```

### 주의사항

1. **Node.js 필요**: 서버에 Node.js 18+ 설치 필요 (`node dist/cli.js` 실행)
2. **빌드 필수**: TypeScript 소스 변경 후 `npm run build` 실행하여 `dist/` 갱신
3. **타임아웃 설정**: 대량 데이터 시 계산에 수 초 걸릴 수 있으므로 적절한 타임아웃 설정
4. **입력 데이터 그대로 사용**: 프론트가 보낸 JSON의 `reports`, `albums` 외 다른 필드(`photobook_id`, `child` 등)는 자동 무시됨
5. **filter/hiddenIds**: 프론트에서 필터 설정이 있는 경우 `filter`, `hiddenIds` 필드도 함께 전송하면 동일하게 적용됨
