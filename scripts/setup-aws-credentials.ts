import * as fs from "fs";
import * as path from "path";

const AWS_REGION = "us-west-2";

export class AWSCredentialsSetup {
  async checkCredentials(): Promise<boolean> {
    const requiredEnvVars = [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.log("❌ 다음 환경 변수가 설정되지 않았습니다:");
      missingVars.forEach((varName) => {
        console.log(`   - ${varName}`);
      });
      return false;
    }

    console.log("✅ AWS 자격 증명이 설정되어 있습니다.");
    return true;
  }

  async printSetupInstructions(): Promise<void> {
    console.log("\n🔧 AWS 자격 증명 설정 방법:");
    console.log("\n1. AWS CLI 사용 (권장):");
    console.log("   aws configure");
    console.log("   # 또는");
    console.log("   aws configure set aws_access_key_id YOUR_ACCESS_KEY");
    console.log("   aws configure set aws_secret_access_key YOUR_SECRET_KEY");
    console.log("   aws configure set default.region us-west-2");

    console.log("\n2. 환경 변수 직접 설정:");
    console.log("   export AWS_ACCESS_KEY_ID=your_access_key_here");
    console.log("   export AWS_SECRET_ACCESS_KEY=your_secret_key_here");
    console.log("   export AWS_REGION=us-west-2");

    console.log("\n3. .env 파일 사용:");
    console.log("   .env 파일을 생성하고 다음 내용 추가:");
    console.log("   AWS_ACCESS_KEY_ID=your_access_key_here");
    console.log("   AWS_SECRET_ACCESS_KEY=your_secret_key_here");
    console.log("   AWS_REGION=us-west-2");

    console.log("\n4. AWS IAM 사용자 권한 확인:");
    console.log("   - DeviceFarm:* 권한이 필요합니다");
    console.log("   - 또는 최소한 다음 권한:");
    console.log("     - devicefarm:ListProjects");
    console.log("     - devicefarm:ListDevicePools");
    console.log("     - devicefarm:CreateUpload");
    console.log("     - devicefarm:ScheduleRun");
    console.log("     - devicefarm:GetRun");
    console.log("     - devicefarm:ListArtifacts");

    console.log("\n💡 AWS 자격 증명 설정 후 다시 시도하세요:");
    console.log("   npm run device-farm:list");
  }

  async createEnvFile(): Promise<void> {
    const envPath = path.join(process.cwd(), ".env");

    if (fs.existsSync(envPath)) {
      console.log("⚠️  .env 파일이 이미 존재합니다.");
      return;
    }

    const envContent = `# AWS 설정
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Device Farm 설정 (자동으로 설정됨)
DEVICEFARM_PROJECT_ARN=
DEVICEFARM_DEVICE_POOL_ARN=

# Applitools 설정 (선택사항)
APPLITOOLS_API_KEY=your_applitools_api_key_here
`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ .env 파일이 생성되었습니다: ${envPath}`);
    console.log("   파일을 편집하여 실제 AWS 자격 증명을 입력하세요.");
  }
}

// 스크립트 실행
async function main() {
  const setup = new AWSCredentialsSetup();

  try {
    console.log("AWS 자격 증명을 확인합니다...");

    const hasCredentials = await setup.checkCredentials();

    if (!hasCredentials) {
      await setup.printSetupInstructions();
      await setup.createEnvFile();
    } else {
      console.log("✅ AWS 자격 증명이 올바르게 설정되어 있습니다.");
    }
  } catch (error) {
    console.error("❌ 자격 증명 확인 중 오류 발생:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
