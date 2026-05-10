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

    @FindBy(xpath = "//span[text()='Dashboard']")
    WebElement dashboardMenu;

    @FindBy(xpath = "//span[text()='Analytics']")
    WebElement analyticsMenu;

    @FindBy(xpath = "//span[text()='Rules']")
    WebElement rulesMenu;

    @FindBy(xpath = "//span[text()='State Config']")
    WebElement stateConfigMenu;

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

    @FindBy(xpath = "//span[text()='Offer Calculator']")
    WebElement offerCalculatorMenu;

    @FindBy(xpath = "//span[text()='Grade Engine']")
    WebElement gradeEngineMenu;

    @FindBy(xpath = "//span[text()='Conflict Detector']")
    WebElement conflictDetectorMenu;

    @FindBy(xpath = "//span[text()='Segment Heatmap']")
    WebElement segmentHeatmapMenu;

    @FindBy(xpath = "//span[text()='Bypass Manager']")
    WebElement bypassManagerMenu;

    @FindBy(xpath = "//span[text()='APR Delta Editor']")
    WebElement aprDeltaEditorMenu;

    @FindBy(xpath = "//span[text()='Dedup Visualiser']")
    WebElement dedupVisualiserMenu;

    @FindBy(xpath = "//span[text()='Lineage Tracer']")
    WebElement lineageTracerMenu;

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

    @FindBy(xpath = "(//button[contains(text(),'Promote to PROD')])[2]")
    WebElement promoteToProdButton;

    // Cutoff Builder Locators
    @FindBy(xpath = "(//button[contains(text(),'Add Row')])[1]")
    WebElement addRowButton;

    @FindBy(xpath = "//button[contains(text(),'Save to Backend')]")
    WebElement saveToBackendButton;

    // Offer Calculator Locators
    @FindBy(xpath = "//label[contains(text(),'Credit Grade')]/following::select[1]")
    WebElement offerCalcCreditGrade;

    @FindBy(xpath = "//label[contains(text(),'State')]/following::select[1]")
    WebElement offerCalcState;

    @FindBy(xpath = "//label[contains(text(),'Channel')]/following::select[1]")
    WebElement offerCalcChannel;

    @FindBy(xpath = "//label[contains(text(),'Requested Amount')]/following::input[1]")
    WebElement offerCalcRequestedAmount;

    @FindBy(xpath = "//label[contains(text(),'Monthly Income')]/following::input[1]")
    WebElement offerCalcMonthlyIncome;

    @FindBy(xpath = "//label[contains(text(),'Fixed Obligations')]/following::input[1]")
    WebElement offerCalcFixedObligations;

    @FindBy(xpath = "//button[contains(text(),'Calculate Offer')]")
    WebElement calculateOfferButton;

    // Grade Engine Locators
    @FindBy(xpath = "//label[contains(text(),'Vantage Score')]/following::input[1]")
    WebElement gradeEngineVantageScore;

    @FindBy(xpath = "//label[contains(text(),'Internal Score')]/following::input[1]")
    WebElement gradeEngineInternalScore;

    @FindBy(xpath = "//label[contains(text(),'Channel')]/following::select[1]")
    WebElement gradeEngineChannel;

    @FindBy(xpath = "//label[contains(text(),'State')]/following::select[1]")
    WebElement gradeEngineState;

    @FindBy(xpath = "//label[contains(text(),'Loan Purpose')]/following::select[1]")
    WebElement gradeEngineLoanPurpose;

    @FindBy(xpath = "//label[contains(text(),'Requested Amount')]/following::input[1]")
    WebElement gradeEngineRequestedAmount;

    @FindBy(xpath = "//label[contains(text(),'Grade Loan Amount')]/following::input[1]")
    WebElement gradeEngineLoanAmount;

    @FindBy(xpath = "//label[contains(text(),'Employer Changes')]/following::input[1]")
    WebElement gradeEngineCCREmployerChanges;

    @FindBy(xpath = "//label[contains(text(),'TU AT01S (trade count)')]/following::input[1]")
    WebElement gradeEngineTUATO1S;

    @FindBy(xpath = "//button[contains(text(),'Assign Grade')]")
    WebElement assignGradeButton;

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

            //Dasboard Menu
            moveAndClick(dashboardMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Dashboard Menu");
            captureScreenshot("DashboardMenu");

            // Analytics Menu
            moveAndClick(analyticsMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Analytics Menu");
            captureScreenshot("AnalyticsMenu");

            //Rules Menu
            moveAndClick(rulesMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Rules Menu");
            moveAndClick(rulesEditButton);
            test.log(Status.PASS, "Clicked Rules Edit Button");
            captureScreenshot("Rules_EditModal");
            moveAndClick(cancelButton);
            test.log(Status.PASS, "Clicked Cancel on Rules");

            // State Config Menu
            moveAndClick(stateConfigMenu);
            pause(1);
            scrollToBottom();
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
            pause(1);
            scrollToBottom();
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

            // Navigate to Review Queue first
            moveAndClick(reviewQueueMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.INFO, "Navigated to Review Queue");

            // Navigate to Promote to Prod
            moveAndClick(promoteToProdMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.INFO, "Navigated to Promote to Prod");
            // Click promote button for AE_INVALID_ADDRESS section
            WebDriverWait shortWait = new WebDriverWait(driver, Duration.ofSeconds(3));
            WebElement promoteButton = shortWait.until(ExpectedConditions.elementToBeClickable(promoteToProdButton));
            moveToElement(promoteButton);
            pause(1);
            promoteButton.click();
            test.log(Status.INFO, "Clicked Promote to Prod button for AE_INVALID_ADDRESS");
            pause(1);


            // Version History Log Menu
            moveAndClick(versionHistoryLogMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Version History Log Menu");
            // UW Excel Menu
            moveAndClick(UWExcelMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked UW Excel Menu");
            //Rule Builder Menu
            moveAndClick(ruleBuilderMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Rule Builder Menu");
            //Cutoff Track Menu
            moveAndClick(cutoffTrackMenu);
            pause(1);
            scrollToBottom();
            captureScreenshot("CutoffTrackMenu");
            test.log(Status.PASS, "Clicked Cutoff Tracker Menu");

            //Cutoff Builder Menu
            moveAndClick(cutoffBuilderMenu);
            pause(1);
            scrollToBottom();
            // Take screenshot of the Cutoff Builder page before adding row
            captureScreenshot("Cutoff_Builder_Page");
            test.log(Status.INFO, "Captured screenshot of Cutoff Builder page");

            // Count existing rows in first table before adding
            java.util.List<WebElement> rowsBefore = driver.findElements(By.xpath("(//table)[1]//tbody//tr"));
            int newRowIndex = rowsBefore.size() + 1;
            test.log(Status.INFO, "Rows before Add Row: " + rowsBefore.size() + ", new row index: " + newRowIndex);

            // Click Add Row button
            moveAndClick(addRowButton);
            test.log(Status.INFO, "Clicked Add Row button");
            pause(3);

            // Wait for new row to appear
            wait.until(ExpectedConditions.numberOfElementsToBeMoreThan(By.xpath("(//table)[1]//tbody//tr"), rowsBefore.size()));
            pause(1);

            // Target the new row specifically by its index
            String newRowXpath = "(//table)[1]//tbody//tr[" + newRowIndex + "]";

            // Select CreditGrade - B
            WebElement cgSelect = driver.findElement(By.xpath(newRowXpath + "/td[1]//select"));
            js.executeScript("arguments[0].scrollIntoView({block:'center'});", cgSelect);
            new Select(cgSelect).selectByValue("B");
            test.log(Status.INFO, "Selected CreditGrade: B");
            pause(1);

            // Select Channel - QS
            WebElement chSelect = driver.findElement(By.xpath(newRowXpath + "/td[2]//select"));
            new Select(chSelect).selectByValue("QS");
            test.log(Status.INFO, "Selected Channel: QS");
            pause(1);

            // Select State - FL
            WebElement stSelect = driver.findElement(By.xpath(newRowXpath + "/td[3]//select"));
            new Select(stSelect).selectByValue("FL");
            test.log(Status.INFO, "Selected State: FL");
            pause(1);

            // Wait for React to settle after dropdown changes before setting value
            pause(2);

            // Enter Value - 300 using sendKeys to properly trigger React state
            WebElement valInput = driver.findElement(By.xpath(newRowXpath + "/td[5]//input"));
            js.executeScript("arguments[0].scrollIntoView({block:'center'});", valInput);
            valInput.click();
            valInput.clear();
            valInput.sendKeys("300");
            test.log(Status.INFO, "Entered Value: 300");
            pause(1);

            // Click Save to Backend button
            moveAndClick(saveToBackendButton);
            test.log(Status.INFO, "Clicked Save to Backend button");
            pause(2);


            //Offer Config Loader Menu
            moveAndClick(offerConfigLoaderMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Offer Config Loader Menu");
            //Engine API tester Menu
            moveAndClick(engineAPITesterMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Engine API Tester Menu");
            //Version Manage Menu
            moveAndClick(versionManage);
            pause(1);
            scrollToBottom();
            captureScreenshot("VersionManage");
            test.log(Status.PASS, "Clicked Version Manager Menu");

            // Rule Simulator Menu
            moveAndClick(ruleSimulatorMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Rule Simulator Menu");
            captureScreenshot("RuleSimulatorMenu");

            // Offer Calculator Menu
            moveAndClick(offerCalculatorMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Offer Calculator Menu");
            captureScreenshot("OfferCalculatorMenu");

            WebElement cgDropdown = wait.until(ExpectedConditions.elementToBeClickable(offerCalcCreditGrade));
            moveAndClick(cgDropdown);
            new Select(cgDropdown).selectByVisibleText("B2");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", cgDropdown);
            test.log(Status.PASS, "Selected Credit Grade: B2");

            WebElement stDropdown = wait.until(ExpectedConditions.elementToBeClickable(offerCalcState));
            moveAndClick(stDropdown);
            new Select(stDropdown).selectByVisibleText("FL");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", stDropdown);
            test.log(Status.PASS, "Selected State: FL");

            WebElement chDropdown = wait.until(ExpectedConditions.elementToBeClickable(offerCalcChannel));
            moveAndClick(chDropdown);
            new Select(chDropdown).selectByVisibleText("CKPQ");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", chDropdown);
            test.log(Status.PASS, "Selected Channel: CKPQ");

            WebElement reqAmtInput = wait.until(ExpectedConditions.elementToBeClickable(offerCalcRequestedAmount));
            moveAndClick(reqAmtInput);
            reqAmtInput.clear();
            reqAmtInput.sendKeys("4000");
            test.log(Status.PASS, "Entered Requested Amount: 4000");

            WebElement monthlyIncInput = wait.until(ExpectedConditions.elementToBeClickable(offerCalcMonthlyIncome));
            moveAndClick(monthlyIncInput);
            monthlyIncInput.clear();
            monthlyIncInput.sendKeys("5000");
            test.log(Status.PASS, "Entered Stated Monthly Income: 5000");

            WebElement fixedObligInput = wait.until(ExpectedConditions.elementToBeClickable(offerCalcFixedObligations));
            moveAndClick(fixedObligInput);
            fixedObligInput.clear();
            fixedObligInput.sendKeys("1");
            test.log(Status.PASS, "Entered Fixed Obligations: 1");

            moveAndClick(calculateOfferButton);
            test.log(Status.PASS, "Clicked Calculate Offer Button");
            pause(2);
            captureScreenshot("OfferCalculator_Result");

            // Grade Engine Menu
            moveAndClick(gradeEngineMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Grade Engine Menu");
            captureScreenshot("GradeEngineMenu");

            WebElement geVantageInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineVantageScore));
            moveAndClick(geVantageInput);
            geVantageInput.clear();
            geVantageInput.sendKeys("800");
            test.log(Status.PASS, "Entered Vantage Score: 800");

            WebElement geInternalInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineInternalScore));
            moveAndClick(geInternalInput);
            geInternalInput.clear();
            geInternalInput.sendKeys("900");
            test.log(Status.PASS, "Entered Internal Score: 900");

            WebElement geChanDropdown = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineChannel));
            moveAndClick(geChanDropdown);
            new Select(geChanDropdown).selectByVisibleText("MO");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", geChanDropdown);
            test.log(Status.PASS, "Selected Channel: MO");

            WebElement geStateDropdown = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineState));
            moveAndClick(geStateDropdown);
            new Select(geStateDropdown).selectByVisibleText("DE");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", geStateDropdown);
            test.log(Status.PASS, "Selected State: DE");

            WebElement geLoanPurposeDropdown = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineLoanPurpose));
            moveAndClick(geLoanPurposeDropdown);
            new Select(geLoanPurposeDropdown).selectByVisibleText("Medical");
            js.executeScript("arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", geLoanPurposeDropdown);
            test.log(Status.PASS, "Selected Loan Purpose: Medical");

            WebElement geReqAmtInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineRequestedAmount));
            moveAndClick(geReqAmtInput);
            geReqAmtInput.clear();
            geReqAmtInput.sendKeys("3500");
            test.log(Status.PASS, "Entered Requested Amount: 3500");

            WebElement geLoanAmtInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineLoanAmount));
            moveAndClick(geLoanAmtInput);
            geLoanAmtInput.clear();
            geLoanAmtInput.sendKeys("4500");
            test.log(Status.PASS, "Entered Grade Loan Amount: 4500");

            WebElement geCCRInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineCCREmployerChanges));
            moveAndClick(geCCRInput);
            geCCRInput.clear();
            geCCRInput.sendKeys("2");
            test.log(Status.PASS, "Entered CCR Employer Changes: 2");

            WebElement geTUInput = wait.until(ExpectedConditions.elementToBeClickable(gradeEngineTUATO1S));
            moveAndClick(geTUInput);
            geTUInput.clear();
            geTUInput.sendKeys("7");
            test.log(Status.PASS, "Entered TU ATO1S: 7");

            moveAndClick(assignGradeButton);
            test.log(Status.PASS, "Clicked Assign Grade Button");
            pause(1);
            js.executeScript("window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0; var main=document.querySelector('main'); if(main) main.scrollTop=0;");
            pause(2);
            captureScreenshot("GradeEngine_Result");

            // Conflict Detector Menu
            moveAndClick(conflictDetectorMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Conflict Detector Menu");
            captureScreenshot("ConflictDetectorMenu");

            // Segment Heatmap Menu
            moveAndClick(segmentHeatmapMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Segment Heatmap Menu");
            captureScreenshot("SegmentHeatmapMenu");

            // Bypass Manager Menu
            moveAndClick(bypassManagerMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Bypass Manager Menu");
            captureScreenshot("BypassManagerMenu");

            // APR Delta Editor Menu
            moveAndClick(aprDeltaEditorMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked APR Delta Editor Menu");
            captureScreenshot("APRDeltaEditorMenu");

            // Dedup Visualiser Menu
            moveAndClick(dedupVisualiserMenu);
            test.log(Status.PASS, "Clicked Dedup Visualiser Menu");
            pause(1);
            js.executeScript(
                "var cards = document.querySelectorAll('.card');" +
                "cards.forEach(function(c) { if(getComputedStyle(c).overflowY === 'auto' || c.style.overflowY === 'auto') c.scrollTop = c.scrollHeight; });"
            );
            pause(1);
            captureScreenshot("DedupVisualiserMenu");

            // Lineage Tracer Menu
            moveAndClick(lineageTracerMenu);
            pause(1);
            scrollToBottom();
            test.log(Status.PASS, "Clicked Lineage Tracer Menu");
            captureScreenshot("LineageTracerMenu");
            pause(3);

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
        js.executeScript(
            "var el = document.querySelector('main.main') || document.querySelector('main') || document.querySelector('.layout') || document.documentElement || document.body;" +
            "el.scrollTop = el.scrollHeight;" +
            "window.scrollTo(0, document.body.scrollHeight);"
        );
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