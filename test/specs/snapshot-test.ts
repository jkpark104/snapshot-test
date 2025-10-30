import {
  BatchInfo,
  ClassicRunner,
  Configuration,
  Eyes,
  MatchLevel,
  Target,
} from "@applitools/eyes-webdriverio";
import { browser } from "@wdio/globals";
import type { MainLayout } from "../../types/main-layout";

const ONE_SECOND = 1000;
const ZERO = 0;
const APPLITOOLS_API_KEY = process.env.APPLITOOLS_API_KEY;
const PLATFORM_VERSION = process.env.PLATFORM_VERSION;
const DEVICE_NAME = process.env.DEVICE_NAME;

const TEST_CONFIG = {
  BASE_URL: "https://app-main.socar.me",
  ORDER_INDEX_OFFSET: 1,
  TIMEOUT: 10_000,
  BATCH_NAME: "App Main Snapshot Test",
  BATCH_ID: "app-main-devicefarm-batch",
} as const;

describe("Snapshot Tests", () => {
  let eyes: Eyes;
  let runner: ClassicRunner;
  let configuration: Configuration;
  let batch: BatchInfo;

  before(async () => {
    if (!APPLITOOLS_API_KEY) {
      throw new Error("APPLITOOLS_API_KEY가 설정되지 않았습니다.");
    }

    const { platformName, browserName } = browser.capabilities;

    batch = new BatchInfo(TEST_CONFIG.BATCH_NAME);
    batch.setId(TEST_CONFIG.BATCH_ID);
    batch.setSequenceName("App Main Flow");

    runner = new ClassicRunner();

    configuration = new Configuration();
    configuration.setMatchLevel(MatchLevel.Exact);
    configuration.setBaselineEnvName(
      `${platformName}-${browserName}-${PLATFORM_VERSION}-${DEVICE_NAME}`
    );
    configuration.setHostApp(`${browserName}`);
    configuration.setHostOS(`${platformName} ${PLATFORM_VERSION}`);
    configuration.setApiKey(APPLITOOLS_API_KEY);
    configuration.setBatch(batch);
  });

  beforeEach(async () => {
    eyes = new Eyes(runner);
    eyes.setConfiguration(configuration);

    await eyes.open(browser, "Socar App Main", "앱 메인 스냅샷 테스트");
  });

  afterEach(async () => {
    try {
      const results = await eyes.close(false);

      // 차이점 발견 시 로그만 남기고 에러로 처리하지 않음
      if (results.getStatus() !== "Passed") {
        console.log(
          `스냅샷 차이 발견: ${results.getUrl()}\n`,
          `상태: ${results.getStatus()}\n`,
          `일치율: ${results.getMatches()}/${results.getSteps()}`
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("detected differences")
      ) {
        // 차이점 발견은 정상적인 케이스로 처리
        console.log("스냅샷 차이가 감지되었습니다 - 검토가 필요합니다");
      } else {
        // 실제 에러는 throw
        throw error;
      }
    } finally {
      await eyes.abortIfNotClosed();
    }
  });

  after(async () => {
    try {
      await runner.getAllTestResults(false);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("detected differences")
      ) {
        console.log(
          "일부 테스트에서 차이점이 발견되었습니다 - 검토가 필요합니다"
        );
      } else {
        console.error("테스트 결과 수집 중 에러 발생:", error);
      }
    }
  });

  it("각 탭의 모든 컨텐츠가 올바르게 표시되어야 한다", async () => {
    await browser.url(TEST_CONFIG.BASE_URL);

    // 페이지 로딩 완료 대기
    await browser.waitUntil(
      async () => {
        const state = await browser.execute(() => document.readyState);
        return state === "complete";
      },
      {
        timeout: TEST_CONFIG.TIMEOUT,
        timeoutMsg: "페이지 로딩이 완료되지 않았습니다.",
      }
    );

    const nextData = await browser.execute(() => window.__NEXT_DATA__);
    const mainLayoutData: MainLayout = nextData.props.pageProps.mainLayout;

    expect(mainLayoutData).toBeDefined();

    const appMainTab = browser.$('[data-testid="app-main-tab"]');
    expect(await appMainTab.isExisting()).toBe(true);

    const tabButtons = appMainTab.$$('[role="button"]');
    expect(await tabButtons.length).toBe(mainLayoutData.layout.tabs.length);

    // 각 탭 테스트
    for (const { displayOrder } of mainLayoutData.layout.tabs) {
      const tabIndex = displayOrder - TEST_CONFIG.ORDER_INDEX_OFFSET;
      const tabButton = tabButtons[tabIndex];

      // 탭 클릭
      await tabButton.click();

      const targetMainLayout = browser.$(
        `[data-testid="main-layout_${tabIndex}"]`
      );
      expect(await targetMainLayout.isDisplayed()).toBe(true);

      const [mainLayoutScrollHeight, mainLayoutClientHeight] =
        await browser.execute((mainLayoutIndex) => {
          const mainLayoutContainer = document
            .querySelector(`[data-testid="main-layout_${mainLayoutIndex}"]`)
            ?.closest(".main-layout");

          if (!mainLayoutContainer) {
            throw new Error("mainLayoutContainer가 존재하지 않습니다.");
          }

          return [
            mainLayoutContainer.scrollHeight,
            mainLayoutContainer.clientHeight,
          ];
        }, tabIndex);

      // 스크롤하면서 스냅샷 찍기
      let currentScroll = ZERO;
      while (currentScroll <= mainLayoutScrollHeight) {
        // 스크롤 이동
        await browser.execute(
          (mainLayoutIndex, scrollY) => {
            const mainLayoutContainer = document
              .querySelector(`[data-testid="main-layout_${mainLayoutIndex}"]`)
              ?.closest(".main-layout");

            if (!mainLayoutContainer) {
              throw new Error("mainLayoutContainer가 존재하지 않습니다.");
            }

            mainLayoutContainer.scrollTo({ top: scrollY });
          },
          tabIndex,
          currentScroll
        );

        // 스크롤 애니메이션 대기
        await browser.pause(ONE_SECOND);

        // 스냅샷 찍기
        await eyes.check(`main-layout_${tabIndex}`, Target.window());

        // 다음 viewport 높이만큼 스크롤
        currentScroll += mainLayoutClientHeight;
      }
    }
  });
});
