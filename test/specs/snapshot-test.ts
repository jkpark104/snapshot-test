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

  /**
   * 전체 페이지를 스크롤하면서 스냅샷 촬영
   */
  async function captureFullPageWithScroll(
    checkName: string,
    selector?: string
  ): Promise<number> {
    try {
      const scrollInfo = await browser.execute((targetSelector) => {
        let scrollContainer: Element | null = document.body;

        if (targetSelector) {
          scrollContainer = document.querySelector(targetSelector);
        }

        if (!scrollContainer) {
          scrollContainer = document.body;
        }

        return {
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight,
          initialScrollTop: scrollContainer.scrollTop,
        };
      }, selector);

      const { scrollHeight, clientHeight } = scrollInfo;
      let currentScroll = ZERO;
      let snapshotCount = 0;

      console.log(
        `전체 페이지 스냅샷 시작 - scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}`
      );

      while (currentScroll <= scrollHeight) {
        // 스크롤 이동
        await browser.execute(
          (targetSelector, scrollY) => {
            let scrollContainer: Element | null = document.body;

            if (targetSelector) {
              scrollContainer = document.querySelector(targetSelector);
            }

            if (!scrollContainer) {
              scrollContainer = document.body;
            }

            scrollContainer.scrollTo({ top: scrollY });
          },
          selector,
          currentScroll
        );

        // 스크롤 애니메이션 및 콘텐츠 로딩 대기
        await browser.pause(ONE_SECOND);

        // 스냅샷 찍기
        await eyes.check(
          `${checkName}_scroll_${snapshotCount}`,
          Target.window()
        );

        snapshotCount++;
        currentScroll += clientHeight;
      }

      console.log(`${checkName}: ${snapshotCount}개의 스냅샷을 촬영했습니다.`);
      return snapshotCount;
    } catch (error) {
      console.error(`전체 페이지 스냅샷 촬영 중 오류:`, error);
      // 오류 발생 시 최소한 현재 뷰포트라도 촬영
      await eyes.check(`${checkName}_viewport_only`, Target.window());
      return 1;
    }
  }

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
    const mainLayoutData: MainLayout | undefined =
      nextData?.props?.pageProps?.mainLayout;

    // mainLayoutData가 없거나 탭이 없는 경우: 전체 페이지 스냅샷
    if (
      !mainLayoutData ||
      !mainLayoutData.layout?.tabs ||
      mainLayoutData.layout.tabs.length === 0
    ) {
      console.log("탭 정보가 없습니다. 전체 페이지의 스냅샷을 찍습니다.");
      await captureFullPageWithScroll("full-page-no-tabs");
      return;
    }

    const appMainTab = browser.$('[data-testid="app-main-tab"]');

    // appMainTab이 존재하는지 확인
    const isAppMainTabExisting = await appMainTab.isExisting();
    if (!isAppMainTabExisting) {
      console.log(
        "app-main-tab이 존재하지 않습니다. 전체 페이지의 스냅샷을 찍습니다."
      );
      await captureFullPageWithScroll("full-page-no-app-main-tab");
      return;
    }

    const tabButtons = appMainTab.$$('[role="button"]');
    const tabButtonsLength = await tabButtons.length;

    // 탭 버튼이 없는 경우: 전체 페이지 스냅샷
    if (tabButtonsLength === 0) {
      console.log("탭 버튼이 없습니다. 전체 페이지의 스냅샷을 찍습니다.");
      await captureFullPageWithScroll("full-page-no-tab-buttons");
      return;
    }

    console.log(
      `${tabButtonsLength}개의 탭 버튼을 찾았습니다. (기대값: ${mainLayoutData.layout.tabs.length})`
    );

    // 각 탭 테스트
    for (const { displayOrder } of mainLayoutData.layout.tabs) {
      const tabIndex = displayOrder - TEST_CONFIG.ORDER_INDEX_OFFSET;

      // 탭 버튼이 존재하는지 확인
      if (tabIndex >= tabButtonsLength) {
        console.log(
          `탭 인덱스 ${tabIndex}에 해당하는 버튼이 없습니다. 건너뜁니다.`
        );
        continue;
      }

      const tabButton = tabButtons[tabIndex];

      try {
        // 탭 클릭
        await tabButton.click();
        await browser.pause(ONE_SECOND); // 탭 전환 애니메이션 대기

        const targetMainLayout = browser.$(
          `[data-testid="main-layout_${tabIndex}"]`
        );

        // main-layout이 표시되지 않는 경우
        const isTargetMainLayoutDisplayed =
          await targetMainLayout.isDisplayed();
        if (!isTargetMainLayoutDisplayed) {
          console.log(
            `main-layout_${tabIndex}가 표시되지 않습니다. 현재 화면의 스냅샷을 찍습니다.`
          );
          await captureFullPageWithScroll(`tab_${tabIndex}_fallback`);
          continue;
        }

        const layoutInfo = await browser.execute((mainLayoutIndex) => {
          const mainLayoutContainer = document
            .querySelector(`[data-testid="main-layout_${mainLayoutIndex}"]`)
            ?.closest(".main-layout");

          if (!mainLayoutContainer) {
            return null;
          }

          return {
            scrollHeight: mainLayoutContainer.scrollHeight,
            clientHeight: mainLayoutContainer.clientHeight,
          };
        }, tabIndex);

        // mainLayoutContainer를 찾지 못한 경우
        if (!layoutInfo) {
          console.log(
            `main-layout_${tabIndex}의 컨테이너를 찾을 수 없습니다. 현재 화면의 스냅샷을 찍습니다.`
          );
          await captureFullPageWithScroll(`tab_${tabIndex}_no_container`);
          continue;
        }

        const {
          scrollHeight: mainLayoutScrollHeight,
          clientHeight: mainLayoutClientHeight,
        } = layoutInfo;

        // 스크롤하면서 스냅샷 찍기
        let currentScroll = ZERO;
        let snapshotCount = 0;

        while (currentScroll <= mainLayoutScrollHeight) {
          // 스크롤 이동
          const scrollSuccess = await browser.execute(
            (mainLayoutIndex, scrollY) => {
              const mainLayoutContainer = document
                .querySelector(`[data-testid="main-layout_${mainLayoutIndex}"]`)
                ?.closest(".main-layout");

              if (!mainLayoutContainer) {
                return false;
              }

              mainLayoutContainer.scrollTo({ top: scrollY });
              return true;
            },
            tabIndex,
            currentScroll
          );

          if (!scrollSuccess) {
            console.log(
              `main-layout_${tabIndex} 스크롤 실패. 스냅샷 촬영을 중단합니다.`
            );
            break;
          }

          // 스크롤 애니메이션 대기
          await browser.pause(ONE_SECOND);

          // 스냅샷 찍기
          await eyes.check(
            `main-layout_${tabIndex}_scroll_${snapshotCount}`,
            Target.window()
          );

          snapshotCount++;
          // 다음 viewport 높이만큼 스크롤
          currentScroll += mainLayoutClientHeight;
        }

        console.log(
          `탭 ${tabIndex}: ${snapshotCount}개의 스냅샷을 촬영했습니다.`
        );
      } catch (error) {
        console.error(`탭 ${tabIndex} 처리 중 오류 발생:`, error);
        // 오류가 발생해도 다음 탭으로 계속 진행
        try {
          await captureFullPageWithScroll(`tab_${tabIndex}_error`);
        } catch (snapshotError) {
          console.error(`탭 ${tabIndex} 에러 스냅샷 촬영 실패:`, snapshotError);
        }
      }
    }
  });
});
