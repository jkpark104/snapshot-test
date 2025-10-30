import {
  DeviceFarmClient,
  ListDevicePoolsCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-device-farm";

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const PROJECT_NAME = "app-main-socar-mobile-test";
const DEVICE_POOL_NAME = "mobile-browser-devices";

const deviceFarmClient = new DeviceFarmClient({ region: AWS_REGION });

export class DeviceFarmSetup {
  private projectArn: string | undefined;
  private devicePoolArn: string | undefined;

  async setupProject(): Promise<string> {
    try {
      // 기존 프로젝트 확인
      const listProjectsCommand = new ListProjectsCommand({});
      const projectsResponse = await deviceFarmClient.send(listProjectsCommand);

      const existingProject = projectsResponse.projects?.find(
        (project) => project.name === PROJECT_NAME
      );

      if (existingProject) {
        console.log(`기존 프로젝트를 찾았습니다: ${existingProject.arn}`);
        this.projectArn = existingProject.arn;
        return existingProject.arn!;
      }

      // 프로젝트가 존재하지 않으면 오류 발생
      throw new Error(
        `프로젝트 '${PROJECT_NAME}'을 찾을 수 없습니다. 먼저 AWS Device Farm 콘솔에서 프로젝트를 생성해주세요.`
      );
    } catch (error) {
      console.error("프로젝트 설정 중 오류 발생:", error);
      throw error;
    }
  }

  async setupDevicePool(): Promise<string> {
    if (!this.projectArn) {
      throw new Error("프로젝트가 먼저 설정되어야 합니다.");
    }

    try {
      // 기존 디바이스 풀 확인
      const listDevicePoolsCommand = new ListDevicePoolsCommand({
        arn: this.projectArn,
      });
      const devicePoolsResponse = await deviceFarmClient.send(
        listDevicePoolsCommand
      );

      const existingDevicePool = devicePoolsResponse.devicePools?.find(
        (pool) => pool.name === DEVICE_POOL_NAME
      );

      if (existingDevicePool) {
        console.log(`기존 디바이스 풀을 찾았습니다: ${existingDevicePool.arn}`);
        this.devicePoolArn = existingDevicePool.arn;
        return existingDevicePool.arn!;
      }

      // 디바이스 풀이 존재하지 않으면 오류 발생
      throw new Error(
        `디바이스 풀 '${DEVICE_POOL_NAME}'을 찾을 수 없습니다. 먼저 AWS Device Farm 콘솔에서 디바이스 풀을 생성해주세요.`
      );
    } catch (error) {
      console.error("디바이스 풀 설정 중 오류 발생:", error);
      throw error;
    }
  }

  async getProjectArn(): Promise<string | undefined> {
    return this.projectArn;
  }

  async getDevicePoolArn(): Promise<string | undefined> {
    return this.devicePoolArn;
  }
}

// 스크립트 실행
async function main() {
  const setup = new DeviceFarmSetup();

  try {
    console.log("AWS Device Farm 설정을 시작합니다...");

    const projectArn = await setup.setupProject();
    const devicePoolArn = await setup.setupDevicePool();

    console.log("설정 완료!");
    console.log(`프로젝트 ARN: ${projectArn}`);
    console.log(`디바이스 풀 ARN: ${devicePoolArn}`);

    // 환경 변수로 저장
    console.log("\n환경 변수 설정:");
    console.log(`export DEVICEFARM_PROJECT_ARN="${projectArn}"`);
    console.log(`export DEVICEFARM_DEVICE_POOL_ARN="${devicePoolArn}"`);
  } catch (error) {
    console.error("설정 실패:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
