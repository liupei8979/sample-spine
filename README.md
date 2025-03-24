# Spine CanvasKit Animation Demo

## 개요

이 프로젝트는 Spine 애니메이션을 웹 브라우저에서 CanvasKit(Skia)을 사용하여 렌더링하는 데모 애플리케이션입니다. React와 TypeScript로 구현되었으며, 여러 Spine 캐릭터를 동시에 로드하고 다양한 애니메이션을 제어할 수 있습니다.

## 주요 기능

- 여러 Spine 캐릭터 동시 렌더링 (스파인보이, 에일리언)
- 각 캐릭터별 애니메이션 선택 및 재생
- 재생/일시정지 컨트롤
- 실시간 캐릭터 크기 조절
- 투명 배경 지원 (다른 요소와 중첩 가능)
- 디버그 정보 표시
- 고해상도 디스플레이 지원

## 설치 및 실행

### 사전 요구사항

- Node.js 14.0 이상
- Yarn 패키지 매니저

### 설치

1. 저장소 클론하기

```bash
git clone git@github.com:liupei8979/sample-spine.git
cd sample-spine
```

2. 의존성 설치

```bash
yarn
```

3. 개발 서버 실행

```bash
yarn dev
```

4. 빌드

```bash
yarn build
```

5. 빌드된 결과물 미리보기

```bash
yarn preview
```

## 의존성 추가 방법

새로운 패키지를 추가하려면:

```bash
yarn add package-name
```

개발 의존성으로 추가하려면:

```bash
yarn add -D package-name
```

## 기술 스택

- React
- TypeScript
- Vite
- CanvasKit (Skia)
- Spine Runtime

## 프로젝트 구조

```
sample-spine/
├── public/                  # 정적 에셋
│   └── raptor/              # 추가 Spine 모델 에셋
├── src/                     # 소스 코드
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── Loading.tsx      # 로딩 인디케이터 컴포넌트
│   ├── assets/              # 프로젝트 에셋
│   ├── App.css              # 메인 애플리케이션 스타일
│   ├── App.tsx              # 메인 애플리케이션 컴포넌트
│   ├── index.css            # 전역 스타일
│   ├── main.tsx             # 진입점
│   └── vite-env.d.ts        # Vite 타입 선언
```

## 사용 방법

### 애니메이션 변경

1. 각 캐릭터 섹션에서 원하는 애니메이션 버튼을 클릭합니다.
2. 현재 선택된 애니메이션은 강조 표시됩니다.

### 재생 제어

- "일시정지" 버튼을 클릭하여 모든 애니메이션을 일시 중지합니다.
- "재생" 버튼을 클릭하여 모든 애니메이션을 재생합니다.

### 크기 조절

- 각 캐릭터 섹션의 슬라이더를 사용하여 캐릭터의 크기를 실시간으로 조절할 수 있습니다.

### 디버그 정보

- 화면 하단에 애니메이션 로딩 및 재생 관련 로그를 확인할 수 있습니다.

## 확장 및 사용자 정의

- `src/App.tsx` 파일에서 Spine 모델 경로를 변경하여 다른 Spine 모델을 로드할 수 있습니다.
- `src/App.css` 파일에서 UI 스타일을 사용자 정의할 수 있습니다.

## 스크립트 설명

`package.json`에 정의된 스크립트:

- `yarn dev`: 개발 서버 실행
- `yarn build`: 프로덕션용 빌드 생성
- `yarn preview`: 빌드된 결과물 미리보기
- `yarn lint`: ESLint로 코드 검사
- `yarn typecheck`: TypeScript 타입 체크

## 주의사항

- 이 데모는 WebGL을 지원하는 최신 브라우저가 필요합니다.
- Spine 라이센스가 필요할 수 있습니다. 상업적 사용 전 Spine 라이센스 확인을 권장합니다.

## 문제 해결

- WebGL 관련 오류가 발생하면 브라우저의 하드웨어 가속이 활성화되어 있는지 확인하세요.
- 특정 Spine 모델이 로드되지 않는 경우 모델 파일의 버전 호환성을 확인하세요.

## 라이센스

이 프로젝트는 MIT 라이센스로 제공됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.
