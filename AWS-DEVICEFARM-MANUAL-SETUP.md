# AWS Device Farm 수동 설정 가이드

## 🎯 문제 해결 방법

현재 `APPIUM_WEB_NODE` 타입이 custom environment mode에서만 작동하는 문제가 있습니다. 다음 방법들을 시도해보세요:

## 방법 1: AWS Device Farm 콘솔에서 직접 설정

### 1. AWS Device Farm 콘솔 접속

- AWS 콘솔 → Device Farm → 프로젝트 선택

### 2. 새 테스트 실행 생성

- "Create a new run" 클릭
- Test type: "Custom environment" 선택
- Test spec file: `devicefarm-test-spec.yml` 업로드
- Test package: `test-package.zip` 업로드

### 3. 디바이스 풀 선택

- 기존 디바이스 풀 선택 또는 새로 생성

### 4. 설정 구성

- Job timeout: 60분
- Network profile: 기본값
- Location: 시애틀 (47.6204, -122.3491)

## 방법 2: 다른 테스트 타입 사용

현재 스크립트에서 `APPIUM_WEB_JAVA_JUNIT_TEST_SPEC` 타입을 사용하도록 변경했습니다.

```bash
npm run device-farm:test
```

## 방법 3: 로컬 테스트 환경 사용

Device Farm 대신 로컬에서 테스트를 실행:

```bash
# 로컬 WebdriverIO 테스트 실행
npm run wdio

# 또는 Device Farm 설정 파일 사용
npx wdio run wdio.devicefarm.conf.ts
```

## 방법 4: 다른 클라우드 테스트 서비스 사용

- **BrowserStack**: WebdriverIO와 잘 통합됨
- **Sauce Labs**: 모바일 웹 테스트 지원
- **LambdaTest**: 크로스 브라우저 테스트

## 🔧 현재 설정 파일들

### devicefarm-test-spec.yml

```yaml
version: 0.1

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - echo "Installing dependencies..."
      - npm install

  pre_test:
    commands:
      - echo "Pre-test setup..."
      - export NODE_ENV=test

  test:
    commands:
      - echo "Running WebdriverIO tests..."
      - npx wdio run wdio.devicefarm.conf.ts

  post_test:
    commands:
      - echo "Post-test cleanup..."
      - echo "Test completed"
```

### wdio.devicefarm.conf.ts

Device Farm용 WebdriverIO 설정 파일이 준비되어 있습니다.

## 💡 권장사항

1. **AWS Device Farm 콘솔에서 직접 설정** (가장 확실한 방법)
2. **로컬 테스트 환경 사용** (빠른 개발/테스트)
3. **다른 클라우드 서비스 고려** (더 안정적인 대안)

## 🚀 다음 단계

1. AWS Device Farm 콘솔에서 수동으로 테스트 설정
2. 또는 로컬에서 테스트 실행
3. 필요시 다른 클라우드 서비스로 마이그레이션
