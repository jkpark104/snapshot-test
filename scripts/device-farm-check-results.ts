import {
  DeviceFarmClient,
  GetRunCommand,
  ListArtifactsCommand,
} from "@aws-sdk/client-device-farm";
import * as fs from "fs";

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const deviceFarmClient = new DeviceFarmClient({ region: AWS_REGION });

export class DeviceFarmResultChecker {
  async checkTestStatus(runArn: string): Promise<void> {
    try {
      console.log(`📊 테스트 상태 확인 중: ${runArn}`);

      const getRunCommand = new GetRunCommand({ arn: runArn });
      const runResponse = await deviceFarmClient.send(getRunCommand);
      const run = runResponse.run;

      if (!run) {
        throw new Error("테스트 실행 정보를 가져올 수 없습니다.");
      }

      console.log("\n테스트 실행 정보:");
      console.log(`  이름: ${run.name}`);
      console.log(`  상태: ${run.status}`);
      console.log(`  결과: ${run.result || "N/A"}`);
      console.log(`  시작 시간: ${run.started || "N/A"}`);
      console.log(`  완료 시간: ${run.stopped || "N/A"}`);

      if (run.counters) {
        console.log("\n테스트 카운터:");
        console.log(`  총 테스트: ${run.counters.total}`);
        console.log(`  성공: ${run.counters.passed}`);
        console.log(`  실패: ${run.counters.failed}`);
        console.log(`  경고: ${run.counters.warned}`);
        console.log(`  오류: ${run.counters.errored}`);
        console.log(`  중지: ${run.counters.stopped}`);
        console.log(`  스킵: ${run.counters.skipped}`);
      }

      // 상태별 처리
      switch (run.status) {
        case "COMPLETED":
          console.log("\n✅ 테스트가 완료되었습니다.");
          await this.getTestResults(runArn);

          // 결과에 따라 exit code 반환
          if (run.result === "PASSED") {
            console.log("🎉 모든 테스트가 성공했습니다!");
          } else if (run.result === "FAILED") {
            console.log("❌ 일부 테스트가 실패했습니다.");
            process.exit(1);
          } else if (run.result === "ERRORED") {
            console.log("⚠️  테스트 실행 중 오류가 발생했습니다.");
            process.exit(1);
          }
          break;

        case "RUNNING":
        case "SCHEDULING":
        case "PREPARING":
        case "PENDING":
          console.log("\n⏳ 테스트가 아직 진행 중입니다.");
          console.log(
            "나중에 다시 확인하거나 AWS Device Farm 콘솔에서 확인하세요."
          );
          console.log(
            `\nAWS Console: https://us-west-2.console.aws.amazon.com/devicefarm/home?region=us-west-2#/projects/${this.extractProjectId(runArn)}/runs/${this.extractRunId(runArn)}`
          );
          break;

        case "STOPPING":
          console.log("\n⏸️  테스트가 중지되고 있습니다.");
          break;

        case "STOPPED":
          console.log("\n⏹️  테스트가 중지되었습니다.");
          break;

        default:
          console.log(`\n❓ 알 수 없는 상태: ${run.status}`);
      }
    } catch (error) {
      console.error("❌ 테스트 상태 확인 중 오류 발생:", error);
      throw error;
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

      if (artifactsResponse.artifacts && artifactsResponse.artifacts.length > 0) {
        console.log("\n📁 테스트 결과 아티팩트:");
        artifactsResponse.artifacts.forEach((artifact) => {
          console.log(`  - ${artifact.name}: ${artifact.url}`);
        });
      } else {
        console.log("\n📁 아티팩트가 없습니다.");
      }
    } catch (error) {
      console.error("테스트 결과 조회 중 오류 발생:", error);
    }
  }

  private extractProjectId(runArn: string): string {
    // arn:aws:devicefarm:us-west-2:637423184630:run:PROJECT_ID/RUN_ID
    const parts = runArn.split(":");
    const lastPart = parts[parts.length - 1]; // run:PROJECT_ID/RUN_ID
    const [, ids] = lastPart.split(":");
    const [projectId] = ids.split("/");
    return projectId;
  }

  private extractRunId(runArn: string): string {
    // arn:aws:devicefarm:us-west-2:637423184630:run:PROJECT_ID/RUN_ID
    const parts = runArn.split("/");
    return parts[parts.length - 1];
  }

  async waitAndCheck(runArn: string, maxWaitMinutes: number = 30): Promise<void> {
    console.log(`⏳ 테스트 완료 대기 중 (최대 ${maxWaitMinutes}분)...`);

    const maxAttempts = maxWaitMinutes * 6; // 10초 간격
    let attempts = 0;

    while (attempts < maxAttempts) {
      const getRunCommand = new GetRunCommand({ arn: runArn });
      const runResponse = await deviceFarmClient.send(getRunCommand);
      const status = runResponse.run?.status;

      console.log(`[${attempts + 1}/${maxAttempts}] 현재 상태: ${status}`);

      if (
        status === "COMPLETED" ||
        status === "STOPPED" ||
        status === "STOPPING"
      ) {
        console.log("\n테스트 실행이 완료되었습니다. 결과를 확인합니다...");
        await this.checkTestStatus(runArn);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
      attempts++;
    }

    console.log("\n⏰ 대기 시간이 초과되었습니다.");
    console.log("테스트가 아직 진행 중일 수 있습니다. 상태를 확인합니다...");
    await this.checkTestStatus(runArn);
  }
}

// 스크립트 실행
async function main() {
  try {
    const args = process.argv.slice(2);
    let runArn = args[0];
    const shouldWait = process.env.WAIT_FOR_COMPLETION === "true";

    // ARN이 인자로 전달되지 않았으면 파일에서 읽기
    if (!runArn) {
      const arnFile = "device-farm-run-arn.txt";
      if (fs.existsSync(arnFile)) {
        runArn = fs.readFileSync(arnFile, "utf-8").trim();
        console.log(`📄 ${arnFile}에서 ARN을 읽었습니다.`);
      } else {
        console.error("❌ Test Run ARN이 필요합니다.");
        console.error("사용법:");
        console.error("  pnpm device-farm:check-results <RUN_ARN>");
        console.error("  또는 device-farm-run-arn.txt 파일에 ARN을 저장하세요.");
        process.exit(1);
      }
    }

    const checker = new DeviceFarmResultChecker();

    if (shouldWait) {
      // 완료될 때까지 대기
      await checker.waitAndCheck(runArn);
    } else {
      // 현재 상태만 확인
      await checker.checkTestStatus(runArn);
    }
  } catch (error) {
    console.error("결과 확인 실패:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
