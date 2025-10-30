# AWS Device Farm 모바일 테스트 설정

이 프로젝트는 AWS Device Farm을 사용하여 모바일 디바이스에서 웹 테스트를 실행하는 설정입니다.

## 프로젝트 정보

- **프로젝트 이름**: `app-main-socar-mobile-test`
- **디바이스 풀**: `mobile-browser-devices`
- **테스트 타입**: WebDriver (모바일 브라우저 테스트)

## 사전 요구사항

1. AWS 계정 및 적절한 권한
2. Node.js 및 npm/pnpm
3. AWS CLI 설정 또는 환경 변수

### AWS 자격 증명 설정

```bash
npm run aws:check
```

이 명령어는 다음을 수행합니다:

- AWS 자격 증명 확인
- 설정 방법 안내
- .env 파일 생성 (필요시)

## 설치

```bash
# 의존성 설치
pnpm install

# 또는 npm 사용
npm install
```

## 환경 변수 설정

`env.example` 파일을 참고하여 환경 변수를 설정하세요:

```bash
# AWS 설정
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Applitools 설정 (선택사항)
export APPLITOOLS_API_KEY=your_applitools_api_key_here
```

## 사용법

### 0. AWS 자격 증명 확인 및 설정

```bash
npm run aws:check
```

### 1. Device Farm 디바이스 풀 목록 조회

```bash
npm run device-farm:list
```

이 명령어는 다음을 수행합니다:

- 프로젝트의 모든 디바이스 풀 목록 조회
- 각 디바이스 풀의 ARN 및 규칙 정보 표시
- 환경 변수 설정 예시 제공

### 2. 기존 Device Farm 리소스 확인

```bash
npm run device-farm:validate
```

이 명령어는 다음을 수행합니다:

- 기존 프로젝트 확인 (`app-main-socar-mobile-test`)
- 기존 디바이스 풀 확인 (`mobile-browser-devices`)
- 환경 변수 출력

### 3. Device Farm 설정 (새 프로젝트 및 디바이스 풀 생성)

```bash
npm run device-farm:setup
```

⚠️ **주의**: 이 명령어는 기존 리소스가 없을 때만 사용하세요. 기존 리소스가 있으면 오류가 발생합니다.

### 4. Device Farm에서 테스트 실행

```bash
npm run device-farm:test
```

이 명령어는 다음을 수행합니다:

- 테스트 패키지 생성 (ZIP 파일)
- Device Farm에 테스트 패키지 업로드
- 테스트 실행 스케줄링
- 테스트 완료 대기
- 결과 조회

### 5. 전체 프로세스 실행

```bash
npm run device-farm:full
```

기존 리소스 확인과 테스트 실행을 한 번에 수행합니다.

## 테스트 구성

### 테스트 파일

- `test/specs/snapshot-test.ts`: 메인 테스트 파일
- `wdio.devicefarm.conf.ts`: Device Farm용 WebdriverIO 설정

### 디바이스 풀 설정

- **플랫폼**: Android, iOS
- **폼 팩터**: Phone
- **원격 접근**: 활성화

### 테스트 타입

- **WebDriver**: 모바일 브라우저에서 웹 테스트
- **브라우저**: Android Chrome, iOS Safari

## 스크립트 파일

### `scripts/device-farm-setup.ts`

- Device Farm 프로젝트 및 디바이스 풀 생성
- 기존 리소스 확인 및 재사용

### `scripts/device-farm-test-runner.ts`

- 테스트 패키지 생성 및 업로드
- 테스트 실행 및 모니터링
- 결과 조회

## 설정 파일

### `devicefarm-config.json`

Device Farm 테스트 실행 설정:

- 테스트 스펙 경로
- 테스트 타입 (WEB_DRIVER)
- 타임아웃 설정
- 로케일 및 위치 설정

### `wdio.devicefarm.conf.ts`

WebdriverIO Device Farm 설정:

- Device Farm 환경 변수 사용
- 모바일 브라우저 capabilities
- Appium 서버 설정

## 테스트 결과

테스트 실행 후 다음 정보를 확인할 수 있습니다:

- 테스트 실행 상태
- 스크린샷 및 로그
- 성능 메트릭
- 오류 리포트

## 문제 해결

### 일반적인 문제

1. **AWS 권한 오류**

   - IAM 사용자에게 Device Farm 권한이 있는지 확인
   - `devicefarm:*` 권한 필요

2. **디바이스 풀에 디바이스가 없음**

   - Device Farm 콘솔에서 디바이스 풀 확인
   - 사용 가능한 디바이스가 있는지 확인

3. **테스트 패키지 업로드 실패**
   - ZIP 파일 크기 확인 (최대 4GB)
   - 네트워크 연결 상태 확인

### 로그 확인

```bash
# 상세 로그 출력
DEBUG=* npm run device-farm:test
```

## 추가 정보

- [AWS Device Farm 문서](https://docs.aws.amazon.com/devicefarm/)
- [WebdriverIO Device Farm 가이드](https://webdriver.io/docs/devicefarm/)
- [Appium 설정 가이드](https://appium.io/docs/en/about-appium/intro/)
