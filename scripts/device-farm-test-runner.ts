import {
  CreateUploadCommand,
  DeviceFarmClient,
  GetRunCommand,
  GetUploadCommand,
  ListArtifactsCommand,
  ScheduleRunCommand,
} from "@aws-sdk/client-device-farm";
import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const PROJECT_ARN = process.env.DEVICEFARM_PROJECT_ARN;
const DEVICE_POOL_ARN = process.env.DEVICEFARM_DEVICE_POOL_ARN;

const deviceFarmClient = new DeviceFarmClient({ region: AWS_REGION });

export class DeviceFarmTestRunner {
  private projectArn: string;
  private devicePoolArn: string;

  constructor(projectArn?: string, devicePoolArn?: string) {
    this.projectArn = projectArn || PROJECT_ARN || "";
    this.devicePoolArn = devicePoolArn || DEVICE_POOL_ARN || "";

    if (!this.projectArn || !this.devicePoolArn) {
      throw new Error("프로젝트 ARN과 디바이스 풀 ARN이 필요합니다.");
    }
  }

  async createTestPackage(): Promise<string> {
    const testPackagePath = path.join(process.cwd(), "test-package.zip");

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(testPackagePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        console.log(
          `테스트 패키지가 생성되었습니다: ${testPackagePath} (${archive.pointer()} bytes)`
        );
        resolve(testPackagePath);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);

      // 테스트 파일들 추가
      archive.directory("test/", "test/");
      archive.directory("node_modules/", "node_modules/");
      archive.file("package.json", { name: "package.json" });
      archive.file("tsconfig.json", { name: "tsconfig.json" });
      archive.file("wdio.conf.ts", { name: "wdio.conf.ts" });

      // Device Farm용 설정 파일 추가
      const deviceFarmConfig = {
        testSpec: "test/specs/snapshot-test.ts",
        testType: "APPIUM_WEB_NODE",
        testPackage: {
          type: "ZIP",
        },
      };

      archive.append(JSON.stringify(deviceFarmConfig, null, 2), {
        name: "devicefarm-config.json",
      });

      // Device Farm test spec 파일 추가
      archive.file("devicefarm-test-spec.yml", {
        name: "devicefarm-test-spec.yml",
      });

      archive.finalize();
    });
  }

  async uploadTestPackage(testPackagePath: string): Promise<string> {
    try {
      // 파일 존재 확인
      if (!fs.existsSync(testPackagePath)) {
        throw new Error(
          `테스트 패키지 파일을 찾을 수 없습니다: ${testPackagePath}`
        );
      }

      console.log("📦 1단계: 테스트 패키지 업로드 요청 생성 중...");
      const createUploadCommand = new CreateUploadCommand({
        projectArn: this.projectArn,
        name: "test-package.zip",
        type: "APPIUM_WEB_NODE_TEST_PACKAGE",
        contentType: "application/octet-stream",
      });

      const uploadResponse = await deviceFarmClient.send(createUploadCommand);
      const uploadArn = uploadResponse.upload?.arn;
      const uploadUrl = uploadResponse.upload?.url;

      if (!uploadArn) {
        throw new Error("업로드 ARN을 받지 못했습니다.");
      }

      if (!uploadUrl) {
        throw new Error("업로드 URL을 받지 못했습니다.");
      }

      console.log(`✅ 업로드 요청 생성 완료 - ARN: ${uploadArn}`);
      console.log(`📡 업로드 URL: ${uploadUrl.substring(0, 100)}...`);

      // 2단계: 실제 파일 업로드
      console.log("📤 2단계: 실제 파일 업로드 중...");
      await this.uploadFileToS3(testPackagePath, uploadUrl);

      // 3단계: 업로드 상태 확인 및 대기
      console.log("⏳ 3단계: 업로드 상태 확인 및 대기 중...");
      await this.waitForUploadCompletion(uploadArn);

      console.log("✅ 테스트 패키지 업로드 완료");

      return uploadArn;
    } catch (error) {
      console.error("❌ 테스트 패키지 업로드 중 오류 발생:", error);
      throw error;
    }
  }

  async uploadTestSpec(): Promise<string> {
    try {
      const testSpecPath = path.join(process.cwd(), "devicefarm-test-spec.yml");

      if (!fs.existsSync(testSpecPath)) {
        throw new Error(`Test spec 파일을 찾을 수 없습니다: ${testSpecPath}`);
      }

      console.log("📋 1단계: Test spec 파일 업로드 요청 생성 중...");
      const createUploadCommand = new CreateUploadCommand({
        projectArn: this.projectArn,
        name: "devicefarm-test-spec.yml",
        type: "APPIUM_WEB_NODE_TEST_SPEC",
        contentType: "application/octet-stream",
      });

      const uploadResponse = await deviceFarmClient.send(createUploadCommand);
      const uploadArn = uploadResponse.upload?.arn;
      const uploadUrl = uploadResponse.upload?.url;

      if (!uploadArn) {
        throw new Error("Test spec 업로드 ARN을 받지 못했습니다.");
      }

      if (!uploadUrl) {
        throw new Error("Test spec 업로드 URL을 받지 못했습니다.");
      }

      console.log(`✅ Test spec 업로드 요청 생성 완료 - ARN: ${uploadArn}`);
      console.log(`📡 Test spec 업로드 URL: ${uploadUrl.substring(0, 100)}...`);

      // 2단계: 실제 파일 업로드
      console.log("📤 2단계: Test spec 파일 업로드 중...");
      await this.uploadFileToS3(testSpecPath, uploadUrl);

      // 3단계: 업로드 상태 확인 및 대기
      console.log("⏳ 3단계: Test spec 업로드 상태 확인 및 대기 중...");
      await this.waitForUploadCompletion(uploadArn);

      console.log("✅ Test spec 파일 업로드 완료");

      return uploadArn;
    } catch (error) {
      console.error("❌ Test spec 파일 업로드 중 오류 발생:", error);
      throw error;
    }
  }

  async uploadFileToS3(filePath: string, uploadUrl: string): Promise<void> {
    try {
      const fileContent = fs.readFileSync(filePath);
      const fileSize = fileContent.length;

      console.log(`📁 파일 정보:`);
      console.log(`   - 경로: ${filePath}`);
      console.log(`   - 크기: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - 업로드 URL: ${uploadUrl.substring(0, 100)}...`);

      // AWS Device Farm presigned URL로 업로드
      console.log("🚀 파일 업로드 시작...");
      const startTime = Date.now();

      // Content-Type 헤더를 명시적으로 설정
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: new Uint8Array(fileContent),
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      const endTime = Date.now();
      const uploadTime = (endTime - startTime) / 1000;

      console.log(`⏱️  업로드 완료 - 소요 시간: ${uploadTime.toFixed(2)}초`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ 업로드 실패 응답: ${response.status} ${response.statusText}`
        );
        console.error(`📄 응답 내용: ${errorText}`);
        throw new Error(
          `파일 업로드 실패: ${response.status} ${response.statusText}`
        );
      }

      console.log("✅ 파일이 성공적으로 업로드되었습니다.");
    } catch (error) {
      console.error("❌ 파일 업로드 중 오류 발생:", error);
      throw error;
    }
  }

  async waitForUploadCompletion(uploadArn: string): Promise<void> {
    const maxAttempts = 30; // 5분 대기 (10초 * 30)
    let attempts = 0;

    console.log("🔍 업로드 상태 확인 시작...");

    while (attempts < maxAttempts) {
      try {
        const getUploadCommand = new GetUploadCommand({ arn: uploadArn });
        const uploadResponse = await deviceFarmClient.send(getUploadCommand);
        const status = uploadResponse.upload?.status;

        console.log(
          `📊 업로드 상태 확인 (${attempts + 1}/${maxAttempts}): ${status}`
        );

        if (status === "SUCCEEDED") {
          console.log("✅ 업로드가 성공적으로 완료되었습니다.");
          return;
        } else if (status === "FAILED") {
          const errorMessage =
            uploadResponse.upload?.message || "알 수 없는 오류";
          console.error(`❌ 업로드가 실패했습니다: ${errorMessage}`);
          throw new Error(`업로드가 실패했습니다: ${errorMessage}`);
        }

        console.log(`⏳ 업로드 상태: ${status}, 10초 후 다시 확인...`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
        attempts++;
      } catch (error) {
        console.error("❌ 업로드 상태 확인 중 오류:", error);
        throw error;
      }
    }

    throw new Error("⏰ 업로드 완료 대기 시간이 초과되었습니다.");
  }

  async scheduleTestRun(
    testPackageArn: string,
    testSpecArn: string
  ): Promise<string> {
    try {
      // 환경변수 준비
      const environmentVariables: Record<string, string> = {};

      // APPLITOOLS_API_KEY가 있으면 추가
      if (process.env.APPLITOOLS_API_KEY) {
        environmentVariables.APPLITOOLS_API_KEY = process.env.APPLITOOLS_API_KEY;
        console.log("✅ APPLITOOLS_API_KEY 환경변수가 Device Farm에 전달됩니다.");
      } else {
        console.warn("⚠️  APPLITOOLS_API_KEY 환경변수가 설정되지 않았습니다.");
      }

      const scheduleRunCommand = new ScheduleRunCommand({
        projectArn: this.projectArn,
        appArn: undefined, // 웹 테스트이므로 앱 ARN 불필요
        devicePoolArn: this.devicePoolArn,
        name: "Snapshot Test Run",
        test: {
          type: "APPIUM_WEB_NODE",
          testPackageArn: testPackageArn,
          testSpecArn: testSpecArn, // Custom Environment Mode 필수
          parameters: environmentVariables, // 환경변수 전달
        },
        // Custom environment mode 활성화
        configuration: {
          extraDataPackageArn: undefined,
          networkProfileArn: undefined,
          locale: "en_US",
          location: {
            latitude: 47.6204,
            longitude: -122.3491,
          },
          radios: {
            wifi: true,
            bluetooth: true,
            nfc: false,
            gps: true,
          },
          auxiliaryApps: [],
          billingMethod: "METERED",
        },
      });

      const runResponse = await deviceFarmClient.send(scheduleRunCommand);
      const runArn = runResponse.run?.arn;

      if (!runArn) {
        throw new Error("테스트 실행 ARN을 받지 못했습니다.");
      }

      console.log(`테스트 실행이 스케줄되었습니다: ${runArn}`);
      return runArn;
    } catch (error) {
      console.error("테스트 실행 스케줄링 중 오류 발생:", error);
      throw error;
    }
  }

  async waitForTestCompletion(runArn: string): Promise<void> {
    console.log("테스트 실행 상태를 확인합니다...");

    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 120; // 10분 대기 (5초 간격)

    while (!isCompleted && attempts < maxAttempts) {
      try {
        const getRunCommand = new GetRunCommand({ arn: runArn });
        const runResponse = await deviceFarmClient.send(getRunCommand);
        const status = runResponse.run?.status;

        console.log(`현재 상태: ${status}`);

        if (status === "COMPLETED" || status === "STOPPING") {
          isCompleted = true;
          console.log(`테스트 실행 완료. 최종 상태: ${status}`);

          if (status === "COMPLETED") {
            console.log("✅ 테스트가 성공적으로 완료되었습니다!");
          } else {
            console.log("❌ 테스트 실행에 문제가 발생했습니다.");
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5초 대기
          attempts++;
        }
      } catch (error) {
        console.error("상태 확인 중 오류 발생:", error);
        attempts++;
      }
    }

    if (!isCompleted) {
      console.log("⏰ 테스트 실행 대기 시간이 초과되었습니다.");
    }
  }

  async getTestResults(runArn: string): Promise<void> {
    try {
      const listArtifactsCommand = new ListArtifactsCommand({
        arn: runArn,
        type: "FILE",
      });

      const artifactsResponse = await deviceFarmClient.send(
        listArtifactsCommand
      );

      console.log("\n📊 테스트 결과 아티팩트:");
      artifactsResponse.artifacts?.forEach((artifact) => {
        console.log(`- ${artifact.name}: ${artifact.url}`);
      });
    } catch (error) {
      console.error("테스트 결과 조회 중 오류 발생:", error);
    }
  }

  async runTest(): Promise<void> {
    try {
      console.log("🚀 Device Farm 테스트 실행을 시작합니다...");

      // 1. 테스트 패키지 생성
      console.log("1. 테스트 패키지 생성 중...");
      const testPackagePath = await this.createTestPackage();

      // 2. 테스트 패키지 업로드
      console.log("2. 테스트 패키지 업로드 중...");
      const testPackageArn = await this.uploadTestPackage(testPackagePath);

      // 3. Test spec 파일 업로드 (Custom Environment Mode 필수)
      console.log("3. Test spec 파일 업로드 중...");
      const testSpecArn = await this.uploadTestSpec();

      // 4. 테스트 실행 스케줄링
      console.log("4. 테스트 실행 스케줄링 중...");
      const runArn = await this.scheduleTestRun(testPackageArn, testSpecArn);

      // 5. 테스트 완료 대기
      console.log("5. 테스트 실행 완료 대기 중...");
      await this.waitForTestCompletion(runArn);

      // 6. 결과 조회
      console.log("6. 테스트 결과 조회 중...");
      await this.getTestResults(runArn);

      console.log("✅ Device Farm 테스트 실행이 완료되었습니다!");
    } catch (error) {
      console.error("❌ 테스트 실행 중 오류 발생:", error);
      throw error;
    }
  }
}

// 스크립트 실행
async function main() {
  try {
    const testRunner = new DeviceFarmTestRunner();
    await testRunner.runTest();
  } catch (error) {
    console.error("테스트 실행 실패:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
