import {
  DeviceFarmClient,
  ListDevicePoolsCommand,
  ListProjectsCommand,
} from "@aws-sdk/client-device-farm";

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const PROJECT_NAME = "app-main-socar-mobile-test";

const deviceFarmClient = new DeviceFarmClient({ region: AWS_REGION });

export class DeviceFarmListPools {
  async listAllDevicePools(): Promise<void> {
    try {
      console.log("Device Farm 프로젝트 및 디바이스 풀을 조회합니다...");

      // 프로젝트 확인
      const listProjectsCommand = new ListProjectsCommand({});
      const projectsResponse = await deviceFarmClient.send(listProjectsCommand);

      const existingProject = projectsResponse.projects?.find(
        (project) => project.name === PROJECT_NAME
      );

      if (!existingProject) {
        console.log("사용 가능한 프로젝트 목록:");
        projectsResponse.projects?.forEach((project) => {
          console.log(`- ${project.name}: ${project.arn}`);
        });
        throw new Error(`프로젝트 '${PROJECT_NAME}'을 찾을 수 없습니다.`);
      }

      console.log(`\n📋 프로젝트: ${existingProject.name}`);
      console.log(`ARN: ${existingProject.arn}`);

      // 디바이스 풀 목록 조회
      const listDevicePoolsCommand = new ListDevicePoolsCommand({
        arn: existingProject.arn,
      });
      const devicePoolsResponse = await deviceFarmClient.send(
        listDevicePoolsCommand
      );

      console.log(
        `\n📱 디바이스 풀 목록 (총 ${
          devicePoolsResponse.devicePools?.length || 0
        }개):`
      );

      if (
        devicePoolsResponse.devicePools &&
        devicePoolsResponse.devicePools.length > 0
      ) {
        devicePoolsResponse.devicePools.forEach((pool, index) => {
          console.log(`\n${index + 1}. ${pool.name}`);
          console.log(`   ARN: ${pool.arn}`);
          console.log(`   설명: ${pool.description || "설명 없음"}`);
          console.log(`   규칙 수: ${pool.rules?.length || 0}개`);

          if (pool.rules && pool.rules.length > 0) {
            console.log(`   규칙:`);
            pool.rules.forEach((rule, ruleIndex) => {
              console.log(
                `     ${ruleIndex + 1}. ${rule.attribute} ${rule.operator} ${
                  rule.value
                }`
              );
            });
          }
        });

        console.log(`\n🔧 환경 변수 설정 예시:`);
        console.log(`export DEVICEFARM_PROJECT_ARN="${existingProject.arn}"`);
        console.log(
          `export DEVICEFARM_DEVICE_POOL_ARN="${devicePoolsResponse.devicePools[0].arn}"`
        );

        console.log(`\n💡 사용법:`);
        console.log(
          `위에서 원하는 디바이스 풀의 ARN을 복사하여 환경 변수로 설정하세요.`
        );
        console.log(
          `예: export DEVICEFARM_DEVICE_POOL_ARN="원하는_디바이스_풀_ARN"`
        );
      } else {
        console.log(
          "디바이스 풀이 없습니다. AWS Device Farm 콘솔에서 디바이스 풀을 생성해주세요."
        );
      }
    } catch (error) {
      console.error("디바이스 풀 조회 중 오류 발생:", error);
      throw error;
    }
  }
}

// 스크립트 실행
async function main() {
  const listPools = new DeviceFarmListPools();

  try {
    console.log("AWS Device Farm 디바이스 풀 조회를 시작합니다...");
    await listPools.listAllDevicePools();
    console.log("\n✅ 디바이스 풀 조회 완료!");
  } catch (error) {
    console.error("❌ 디바이스 풀 조회 실패:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
