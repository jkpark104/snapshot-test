import {
  DeviceFarmClient,
  ListDevicePoolsCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-device-farm";

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const PROJECT_NAME = "app-main-socar-mobile-test";
const DEVICE_POOL_NAME = "mobile-browser-devices";

const deviceFarmClient = new DeviceFarmClient({ region: AWS_REGION });

export class DeviceFarmValidator {
  async validateExistingResources(): Promise<{
    projectArn: string;
    devicePoolArn: string;
  }> {
    try {
      console.log("기존 Device Farm 리소스를 확인합니다...");

      // 프로젝트 확인
      const listProjectsCommand = new ListProjectsCommand({});
      const projectsResponse = await deviceFarmClient.send(listProjectsCommand);

      const existingProject = projectsResponse.projects?.find(
        (project) => project.name === PROJECT_NAME
      );

      if (!existingProject) {
        throw new Error(`프로젝트 '${PROJECT_NAME}'을 찾을 수 없습니다.`);
      }

      console.log(`✅ 프로젝트 확인됨: ${existingProject.arn}`);

      // 디바이스 풀 확인
      const listDevicePoolsCommand = new ListDevicePoolsCommand({
        arn: existingProject.arn,
      });
      const devicePoolsResponse = await deviceFarmClient.send(
        listDevicePoolsCommand
      );

      const existingDevicePool = devicePoolsResponse.devicePools?.find(
        (pool) => pool.name === DEVICE_POOL_NAME
      );

      if (!existingDevicePool) {
        console.log("사용 가능한 디바이스 풀 목록:");
        devicePoolsResponse.devicePools?.forEach((pool) => {
          console.log(`- ${pool.name}: ${pool.arn}`);
        });
        throw new Error(
          `디바이스 풀 '${DEVICE_POOL_NAME}'을 찾을 수 없습니다. 위 목록에서 사용 가능한 디바이스 풀을 확인하세요.`
        );
      }

      console.log(
        `✅ 디바이스 풀 확인됨: ${existingDevicePool.name} (${existingDevicePool.arn})`
      );

      return {
        projectArn: existingProject.arn!,
        devicePoolArn: existingDevicePool.arn!,
      };
    } catch (error) {
      console.error("리소스 확인 중 오류 발생:", error);
      throw error;
    }
  }

  async printEnvironmentVariables(): Promise<void> {
    try {
      const { projectArn, devicePoolArn } =
        await this.validateExistingResources();

      console.log("\n🔧 환경 변수 설정:");
      console.log(`export DEVICEFARM_PROJECT_ARN="${projectArn}"`);
      console.log(`export DEVICEFARM_DEVICE_POOL_ARN="${devicePoolArn}"`);
      console.log("\n또는 .env 파일에 추가:");
      console.log(`DEVICEFARM_PROJECT_ARN=${projectArn}`);
      console.log(`DEVICEFARM_DEVICE_POOL_ARN=${devicePoolArn}`);
    } catch (error) {
      console.error("환경 변수 설정 실패:", error);
      throw error;
    }
  }
}

// 스크립트 실행
async function main() {
  const validator = new DeviceFarmValidator();

  try {
    console.log("AWS Device Farm 기존 리소스 확인을 시작합니다...");
    await validator.printEnvironmentVariables();
    console.log("\n✅ 기존 리소스 확인 완료!");
  } catch (error) {
    console.error("❌ 리소스 확인 실패:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
