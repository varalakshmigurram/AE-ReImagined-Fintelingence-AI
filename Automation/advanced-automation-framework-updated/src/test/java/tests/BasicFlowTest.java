package tests;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.*;
import org.testng.annotations.Test;
import utils.ExtentManager;
import utils.ScreenshotUtil;
import com.aventstack.extentreports.MediaEntityBuilder;

import java.time.Duration;

public class BasicFlowTest {

    WebDriver driver;
    WebDriverWait wait;
    JavascriptExecutor js;
    ExtentReports extent = ExtentManager.get();
    ExtentTest test;

    // Main Menu Locators
    @FindBy(xpath = "//span[text()='Rules']")
    WebElement rulesMenu;

    @FindBy(xpath = "//span[text()='State Config']")
    WebElement stateConfigMenu;

    @FindBy(xpath = "//span[text()='Analytics']")
    WebElement analyticsMenu;

    @FindBy(xpath = "//span[text()='Channel Config']")
    WebElement channelConfigMenu;

    @FindBy(xpath = "//span[text()='Review Queue']")
    WebElement reviewQueueMenu;

    @FindBy(xpath = "//span[text()='Promote to Prod']")
    WebElement promoteToProdMenu;

    @FindBy(xpath = "//span[text()='Version History Log']")
    WebElement versionHistoryLogMenu;

    @FindBy(xpath = "//span[contains(text(),'UW Excel')]")
    WebElement UWExcelMenu;

    @FindBy(xpath = "//span[text()='Rule Builder']")
    WebElement ruleBuilderMenu;

    @FindBy(xpath = "//span[text()='Cutoff Tracker']")
    WebElement cutoffTrackMenu;

    @FindBy(xpath = "//span[text()='Cutoff Builder']")
    WebElement cutoffBuilderMenu;

    @FindBy(xpath = "//span[text()='Offer Config Loader']")
    WebElement offerConfigLoaderMenu;

    @FindBy(xpath = "//span[text()='Engine API Tester']")
    WebElement engineAPITesterMenu;

    @FindBy(xpath = "//span[text()='Version Manager']")
    WebElement versionManage;

    @FindBy(xpath = "//span[text()='Rule Simulator']")
    WebElement ruleSimulatorMenu;

    // Action Locators
    @FindBy(xpath = "(//div[@class='row-actions']//button[@title='Edit'])[1]")
    WebElement rulesEditButton;

    @FindBy(xpath = "(//div[contains(@class,'card')][.//span[normalize-space()='CKPQ']]//button)[1]")
    WebElement channelConfigEditButton;

    @FindBy(xpath = "//button[text()='Cancel']")
    WebElement cancelButton;

    @FindBy(xpath = "//div[contains(@class,'card')][.//text()[normalize-space()='AK']]//button[contains(.,'Edit')]")
    WebElement stateConfigEditButton;

    @FindBy(xpath = "//label[contains(text(),'Min Loan Amount')]/following::input[1]")
    WebElement minLoanAmnt;

    @FindBy(xpath = "//button[text()='Update State']")
    WebElement updateState;

    @FindBy(xpath = "//button[text()='Update Channel']")
    WebElement updateChannel;

    @Test
    public void testUIFlow() {

        test = extent.createTest("testUIFlow", "Validates the basic UI navigation flow");

        driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.get("http://localhost:5173");

        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        js = (JavascriptExecutor) driver;
        PageFactory.initElements(driver, this);

        try {

            // Analytics Menu
            moveAndClick(analyticsMenu);
            test.log(Status.PASS, "Clicked Analytics Menu");
            captureScreenshot("AnalyticsMenu");

            //Rules Menu
            moveAndClick(rulesMenu);
            test.log(Status.PASS, "Clicked Rules Menu");
            moveAndClick(rulesEditButton);
            test.log(Status.PASS, "Clicked Rules Edit Button");
            captureScreenshot("Rules_EditModal");
            moveAndClick(cancelButton);
            test.log(Status.PASS, "Clicked Cancel on Rules");

            // State Config Menu
            moveAndClick(stateConfigMenu);
            test.log(Status.PASS, "Clicked State Config Menu");
            captureScreenshot("StateConfigMenu");
            moveAndClick(stateConfigEditButton);
            test.log(Status.PASS, "Clicked State Config Edit Button");
            WebElement minLoanInput = wait.until(ExpectedConditions.visibilityOf(minLoanAmnt));
            moveToElement(minLoanInput);

            // Scroll + update value
            js.executeScript("arguments[0].scrollIntoView({block:'center'});", minLoanInput);
            js.executeScript(
                    "arguments[0].value='1500'; arguments[0].dispatchEvent(new Event('input',{bubbles:true}));",
                    minLoanInput
            );
            System.out.println("Updated Min Loan Amount");
            test.log(Status.PASS, "Updated Min Loan Amount to 1500");
            pause(1);
            moveAndClick(updateState);
            pause(2);
            try {
                WebElement overlay = driver.findElement(By.cssSelector("div.modal-overlay"));
                js.executeScript("arguments[0].click();", overlay);
                pause(1);
            } catch (Exception ignored) {}
            test.log(Status.PASS, "Clicked Update State and dismissed modal");

            // Channel Config Menu
            moveAndClick(channelConfigMenu);
            test.log(Status.PASS, "Clicked Channel Config Menu");
            moveAndClick(channelConfigEditButton);
            test.log(Status.PASS, "Clicked Channel Config Edit Button");
            moveAndClick(updateChannel);
            pause(2);
            try {
                WebElement overlay = driver.findElement(By.cssSelector("div.modal-overlay"));
                js.executeScript("arguments[0].click();", overlay);
                pause(1);
            } catch (Exception ignored) {}
            test.log(Status.PASS, "Clicked Update Channel and dismissed modal");
            scrollToBottom();

            // Review Queue Menu
            moveAndClick(reviewQueueMenu);
            test.log(Status.PASS, "Clicked Review Queue Menu");
            // Promote to Prod Menu
            moveAndClick(promoteToProdMenu);
            test.log(Status.PASS, "Clicked Promote to Prod Menu");
            scrollToBottom();
            // Version History Log Menu
            moveAndClick(versionHistoryLogMenu);
            test.log(Status.PASS, "Clicked Version History Log Menu");
            // UW Excel Menu
            moveAndClick(UWExcelMenu);
            test.log(Status.PASS, "Clicked UW Excel Menu");
            //Rule Builder Menu
            moveAndClick(ruleBuilderMenu);
            test.log(Status.PASS, "Clicked Rule Builder Menu");
            //Cutoff Track Menu
            moveAndClick(cutoffTrackMenu);
            captureScreenshot("CutoffTrackMenu");
            test.log(Status.PASS, "Clicked Cutoff Tracker Menu");
            //Cutoff Builder Menu
            moveAndClick(cutoffBuilderMenu);
            test.log(Status.PASS, "Clicked Cutoff Builder Menu");
            //Offer Config Loader Menu
            moveAndClick(offerConfigLoaderMenu);
            test.log(Status.PASS, "Clicked Offer Config Loader Menu");
            //Engine API tester Menu
            moveAndClick(engineAPITesterMenu);
            test.log(Status.PASS, "Clicked Engine API Tester Menu");
            //Version Manage Menu
            moveAndClick(versionManage);
            captureScreenshot("VersionManage");
            test.log(Status.PASS, "Clicked Version Manager Menu");

            // Rule Simulator Menu
            moveAndClick(ruleSimulatorMenu);
            test.log(Status.PASS, "Clicked Rule Simulator Menu");
            captureScreenshot("RuleSimulatorMenu");
            pause(2);

            test.log(Status.PASS, "testUIFlow completed successfully");

        } catch (Exception e) {
            String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
            String fileName = "AE_RuleEngine_failure_" + timestamp;
            ScreenshotUtil.capture(driver, fileName);
            try {
                test.log(Status.FAIL, "Test failed: " + e.getMessage(),
                        MediaEntityBuilder.createScreenCaptureFromPath(fileName + ".png").build());
            } catch (Exception ex) {
                ex.printStackTrace();
            }
            throw new RuntimeException(e);
        } finally {
            driver.quit();
            extent.flush();
        }
    }

    // ===== REUSABLE METHODS =====

    public void moveAndClick(By locator) {
        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(locator));
        js.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
        el.click();
    }

    public void moveAndClick(WebElement el) {
        wait.until(ExpectedConditions.elementToBeClickable(el));
        js.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
        el.click();
    }

    public void moveToElement(WebElement el) {
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
    }


    public void scrollToBottom() {
        js.executeScript("window.scrollTo(0, document.body.scrollHeight);");
        pause(1);
    }

    public void pause(int seconds) {
        try {
            Thread.sleep(seconds * 1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    public void captureScreenshot(String stepName) {
        String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        String fileName = "AE_RuleEngine_" + stepName + "_" + timestamp;
        ScreenshotUtil.capture(driver, fileName);
        try {
            test.log(Status.INFO, stepName,
                    MediaEntityBuilder.createScreenCaptureFromPath("../report_screenshots/" + fileName + ".png").build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}