# GitHub Actions 설정 가이드

이 문서는 스냅샷 테스트를 GitHub Actions에서 실행하기 위해 필요한 설정을 설명합니다.

## 필수 GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions 에서 다음 secrets를 추가해야 합니다:

### AWS 관련 Secrets

#### 1. `AWS_ACCESS_KEY_ID`
- **설명**: AWS IAM 사용자의 Access Key ID
- **필수 권한**: Device Farm 관련 권한 필요
  - `devicefarm:ListProjects`
  - `devicefarm:GetProject`
  - `devicefarm:ListDevicePools`
  - `devicefarm:GetDevicePool`
  - `devicefarm:CreateUpload`
  - `devicefarm:GetUpload`
  - `devicefarm:ScheduleRun`
  - `devicefarm:GetRun`
  - `devicefarm:ListArtifacts`
- **예시**: `AKIAIOSFODNN7EXAMPLE`

#### 2. `AWS_SECRET_ACCESS_KEY`
- **설명**: AWS IAM 사용자의 Secret Access Key
- **예시**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **주의**: 절대 코드나 로그에 노출되지 않도록 주의하세요

#### 3. `AWS_REGION`
- **설명**: AWS Device Farm이 실행될 리전
- **기본값**: `us-west-2` (Device Farm은 제한된 리전에서만 사용 가능)
- **사용 가능 리전**: `us-west-2`
- **예시**: `us-west-2`

### AWS Device Farm 관련 Secrets

#### 4. `DEVICEFARM_PROJECT_ARN`
- **설명**: Device Farm 프로젝트의 ARN
- **예시**: `arn:aws:devicefarm:us-west-2:123456789012:project:your-project-id`
- **확인 방법**:
  ```bash
  pnpm aws:check
  pnpm device-farm:list
  ```

#### 5. `DEVICEFARM_DEVICE_POOL_ARN`
- **설명**: Device Farm 디바이스 풀의 ARN
- **예시**: `arn:aws:devicefarm:us-west-2:123456789012:devicepool:your-device-pool-id`
- **확인 방법**:
  ```bash
  pnpm device-farm:list
  ```

### 테스트 관련 Secrets

#### 6. `APPLITOOLS_API_KEY`
- **설명**: Applitools Eyes API 키 (스냅샷 테스트용)
- **예시**: `vWfV9knnU9D5uBYhsyEWSrd0jCKkhe393HyBqL8Afxw110`
- **확인 방법**: [Applitools Dashboard](https://eyes.applitools.com)에서 확인
- **주의**: 이 키는 Device Farm 테스트 실행 시 환경변수로 전달됩니다

## GitHub Secrets 설정 방법

1. GitHub 저장소로 이동
2. `Settings` 탭 클릭
3. 왼쪽 사이드바에서 `Secrets and variables` > `Actions` 선택
4. `New repository secret` 버튼 클릭
5. Name과 Secret 값을 입력
6. `Add secret` 버튼 클릭

## Workflow 실행 방법

### 자동 실행
- `main` 또는 `develop` 브랜치에 push하면 자동으로 실행됩니다
- Pull Request 생성 시 자동으로 실행됩니다

### 수동 실행
1. GitHub 저장소의 `Actions` 탭으로 이동
2. 왼쪽에서 "Snapshot Test on AWS Device Farm" workflow 선택
3. 오른쪽 상단의 `Run workflow` 버튼 클릭
4. 테스트할 플랫폼 선택 (Android 또는 iOS)
5. `Run workflow` 버튼 클릭

## Workflow 파일 위치

`.github/workflows/snapshot-test.yml`

## 테스트 플랫폼

- **Android**: Chrome 브라우저를 사용한 웹 테스트
- **iOS**: Safari 브라우저를 사용한 웹 테스트

기본적으로 양쪽 플랫폼에서 모두 실행되며, 수동 실행 시 하나의 플랫폼만 선택할 수 있습니다.

## 결과 확인

1. GitHub Actions 실행 완료 후 `Artifacts` 섹션에서 테스트 결과 다운로드 가능
2. Applitools Dashboard에서 스냅샷 비교 결과 확인
3. Pull Request에 테스트 결과 코멘트가 자동으로 추가됩니다

## 문제 해결

### AWS 자격증명 오류
```
Error: Unable to locate credentials
```
- `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`가 올바르게 설정되었는지 확인

### Device Farm ARN 오류
```
Error: 프로젝트 ARN과 디바이스 풀 ARN이 필요합니다.
```
- `DEVICEFARM_PROJECT_ARN`과 `DEVICEFARM_DEVICE_POOL_ARN`이 설정되었는지 확인
- ARN 형식이 올바른지 확인

### Applitools API 키 오류
```
Error: APPLITOOLS_API_KEY가 설정되지 않았습니다.
```
- `APPLITOOLS_API_KEY` secret이 설정되었는지 확인
- API 키가 유효한지 Applitools Dashboard에서 확인

## 로컬에서 테스트

GitHub Actions로 실행하기 전에 로컬에서 먼저 테스트하는 것을 권장합니다:

```bash
# 환경변수 설정 (.env 파일 또는 직접 export)
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export DEVICEFARM_PROJECT_ARN=your_project_arn
export DEVICEFARM_DEVICE_POOL_ARN=your_device_pool_arn
export APPLITOOLS_API_KEY=your_applitools_key

# Device Farm 설정 검증
pnpm device-farm:validate

# Device Farm에서 테스트 실행
pnpm device-farm:test
```

## 참고 자료

- [AWS Device Farm 문서](https://docs.aws.amazon.com/devicefarm/)
- [Applitools Eyes 문서](https://applitools.com/docs/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
