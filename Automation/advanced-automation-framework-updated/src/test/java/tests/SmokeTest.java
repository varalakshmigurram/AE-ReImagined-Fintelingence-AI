package tests;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;
import com.aventstack.extentreports.MediaEntityBuilder;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.*;
import org.testng.annotations.*;
import utils.ExtentManager;
import utils.ScreenshotUtil;
import utils.ExcelReader;

import java.time.Duration;
import java.io.IOException;

public class SmokeTest {

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

    @FindBy(xpath = "//span[text()='Channel Config']")
    WebElement channelConfigMenu;

    @FindBy(xpath = "//span[text()='Review Queue']")
    WebElement reviewQueueMenu;

    @FindBy(xpath = "//span[text()='Promote to Prod']")
    WebElement promoteToProdMenu;

    @FindBy(xpath = "//span[text()='Version Manager']")
    WebElement versionManage;

    @FindBy(xpath = "//span[text()='Cutoff Builder']")
    WebElement cutoffBuilderMenu;

    @FindBy(xpath = "//span[text()='Dashboard']")
    WebElement dashboardMenu;

    @FindBy(xpath = "//span[text()='Version History Log']")
    WebElement versionHistoryLogMenu;

    // Action Locators
    @FindBy(xpath = "(//div[@class='row-actions']//button[@title='Edit'])[1]")
    WebElement rulesEditButton;

    @FindBy(xpath = "//div[contains(@class,'card')][.//text()[normalize-space()='AK']]//button[contains(.,'Edit')]")
    WebElement stateConfigEditButton;

    @FindBy(xpath = "(//div[contains(@class,'card')][.//span[normalize-space()='CKPQ']]//button)[1]")
    WebElement channelConfigEditButton;

    @FindBy(xpath = "//button[text()='Cancel']")
    WebElement cancelButton;

    @FindBy(xpath = "//label[contains(text(),'Min Loan Amount')]/following::input[1]")
    WebElement minLoanAmnt;

    @FindBy(xpath = "//button[text()='Update State']")
    WebElement updateState;

    @FindBy(xpath = "//button[text()='Update Channel']")
    WebElement updateChannel;

    // New locators for deeper test cases
    @FindBy(xpath = "//div[contains(@class,'card')][.//text()[normalize-space()='FL']]//button[contains(.,'Edit')]")
    WebElement flStateEditButton;

    @FindBy(xpath = "//div[contains(@class,'card')][.//span[normalize-space()='CMACT']]//button[1]")
    WebElement cmactChannelEditButton;

    @FindBy(xpath = "//label[contains(text(),'Min APR')]/following::input[1]")
    WebElement minAprInput;

    @FindBy(xpath = "//label[contains(text(),'Max Term')]/following::input[1]")
    WebElement maxTermInput;

    @FindBy(xpath = "(//button[contains(text(),'Promote to PROD')])[2]")
    WebElement promoteToProdButton;

    // Cutoff Builder Locators
    @FindBy(xpath = "(//button[contains(text(),'Add Row')])[1]")
    WebElement addRowButton;

    @FindBy(xpath = "//button[contains(text(),'Save to Backend')]")
    WebElement saveToBackendButton;

    @BeforeMethod
    public void setup() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.get("http://localhost:5173");
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        js = (JavascriptExecutor) driver;
        PageFactory.initElements(driver, this);
    }

    
    @Test(dataProvider = "smokeTestData")
    public void executeSmokeTest(String testCase, String module, String menu, String action, 
                               String expected, String screenshotName) {
        
        test = extent.createTest(testCase + " - " + module, 
                               "Execute " + action + " on " + menu + " | Expected: " + expected);

        try {
            // Navigate to the menu if specified
            if (!menu.isEmpty()) {
                WebElement menuLocator = getMenuLocator(menu);
                if (menuLocator != null) {
                    moveAndClick(menuLocator);
                    test.log(Status.INFO, "Navigated to: " + menu);
                }
            }

            // Execute the action
            executeAction(action, menu);
            
            // Capture screenshot if specified
            test.log(Status.INFO, "Screenshot name from CSV: '" + screenshotName + "'");
            if (screenshotName != null && !screenshotName.trim().isEmpty() && !screenshotName.equals("NONE")) {
                test.log(Status.INFO, "Capturing general screenshot: " + screenshotName);
                captureScreenshot(screenshotName);
            } else {
                test.log(Status.INFO, "Skipping general screenshot - name is empty or null");
            }

            test.log(Status.PASS, "Test case " + testCase + " executed successfully");

        } catch (Exception e) {
            String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
            String fileName = "SmokeTest_failure_" + timestamp;
            ScreenshotUtil.capture(driver, fileName);
            try {
                test.log(Status.FAIL, "Test failed: " + e.getMessage(),
                        MediaEntityBuilder.createScreenCaptureFromPath("../report_screenshots/" + fileName + ".png").build());
            } catch (Exception ex) {
                ex.printStackTrace();
            }
            throw new RuntimeException(e);
        }
    }

    @DataProvider(name = "smokeTestData")
    public Object[][] getSmokeTestData() throws IOException {
        return ExcelReader.readTestData("smoke_test_data.csv", "smoke_test_data");
    }

    private WebElement getMenuLocator(String menuName) {
        switch (menuName) {
            case "RulesMenu": return rulesMenu;
            case "StateConfigMenu": return stateConfigMenu;
            case "ChannelConfigMenu": return channelConfigMenu;
            case "ReviewQueueMenu": return reviewQueueMenu;
            case "PromoteToProdMenu": return promoteToProdMenu;
            case "VersionManage": return versionManage;
            case "CutoffBuilderMenu": return cutoffBuilderMenu;
            case "DashboardMenu": return dashboardMenu;
            default: return null;
        }
    }

    private void executeAction(String action, String menu) {
        switch (action) {
            case "Click":
                // Click action is already handled by menu navigation
                break;
            case "Edit":
                if (menu.equals("StateConfigMenu")) {
                    moveAndClick(stateConfigEditButton);
                    test.log(Status.INFO, "Clicked State Config Edit Button");
                } else if (menu.equals("ChannelConfigMenu")) {
                    moveAndClick(channelConfigEditButton);
                    test.log(Status.INFO, "Clicked Channel Config Edit Button");
                }
                break;
            case "EditFL":
                // Take screenshot of the state config page before clicking edit
                captureScreenshot("FL_State_Config_Page");
                test.log(Status.INFO, "Captured screenshot of FL state config page");
                moveAndClick(flStateEditButton);
                test.log(Status.INFO, "Clicked FL State Edit Button");
                pause(2);
                // Take screenshot of the FL State edit page
                captureScreenshot("FL_State_Edit_Page");
                test.log(Status.INFO, "Captured screenshot of FL State edit page");
                // Update Min APR to 38
                WebElement minAprElement = wait.until(ExpectedConditions.visibilityOf(minAprInput));
                moveToElement(minAprElement);
                js.executeScript("arguments[0].scrollIntoView({block:'center'});", minAprElement);
                js.executeScript(
                        "arguments[0].value='38'; arguments[0].dispatchEvent(new Event('input',{bubbles:true}));",
                        minAprElement
                );
                pause(2);
                moveAndClick(updateState);
                test.log(Status.INFO, "Updated FL state Min APR to 38 and clicked Update State");
                pause(2);
                break;
            case "EditCMACT":
                // Take screenshot of the channel config main page before clicking edit
                captureScreenshot("CMACT_Channel_Config_Page");
                test.log(Status.INFO, "Captured screenshot of CMACT channel config page");
                moveAndClick(cmactChannelEditButton);
                test.log(Status.INFO, "Clicked CMACT Channel Edit Button");
                pause(2);
                // Take screenshot of the edit dialog box
                captureScreenshot("CMACT_Edit_Dialog");
                test.log(Status.INFO, "Captured screenshot of CMACT edit dialog");
                // Update Max Term to 40
                WebElement maxTermElement = wait.until(ExpectedConditions.visibilityOf(maxTermInput));
                moveToElement(maxTermElement);
                js.executeScript("arguments[0].scrollIntoView({block:'center'});", maxTermElement);
                js.executeScript(
                        "arguments[0].value='40'; arguments[0].dispatchEvent(new Event('input',{bubbles:true}));",
                        maxTermElement
                );
                pause(2);
                moveAndClick(updateChannel);
                test.log(Status.INFO, "Updated CMACT channel Max Term to 40 and clicked Update Channel");
                pause(2);
                break;
            case "PromoteInvalidAddress":
                // Navigate to Review Queue first
                moveAndClick(reviewQueueMenu);
                test.log(Status.INFO, "Navigated to Review Queue");
                pause(1);
                // Navigate to Promote to Prod
                moveAndClick(promoteToProdMenu);
                test.log(Status.INFO, "Navigated to Promote to Prod");
                pause(1);
                // Click promote button for AE_INVALID_ADDRESS section
                WebDriverWait shortWait = new WebDriverWait(driver, Duration.ofSeconds(3));
                WebElement promoteButton = shortWait.until(ExpectedConditions.elementToBeClickable(promoteToProdButton));
                moveToElement(promoteButton);
                pause(1);
                promoteButton.click();
                test.log(Status.INFO, "Clicked Promote to Prod button for AE_INVALID_ADDRESS");
                pause(1);
                break;
            case "NavigateMenus":
                // Navigate through all menus with screenshot and 1.5 sec pause between each
                WebElement[] allMenus = {
                    dashboardMenu, rulesMenu, stateConfigMenu, channelConfigMenu,
                    reviewQueueMenu, promoteToProdMenu, versionHistoryLogMenu,
                    cutoffBuilderMenu, versionManage
                };
                String[] menuNames = {
                    "Dashboard", "Rules", "StateConfig", "ChannelConfig",
                    "ReviewQueue", "PromoteToProd", "VersionHistoryLog",
                    "CutoffBuilder", "VersionManager"
                };
                for (int i = 0; i < allMenus.length; i++) {
                    WebElement menuEl = wait.until(ExpectedConditions.elementToBeClickable(allMenus[i]));
                    js.executeScript("arguments[0].scrollIntoView({block:'center'});", menuEl);
                    menuEl.click();
                    test.log(Status.INFO, "Navigated to: " + menuNames[i]);
                    pause(2);
                    captureScreenshot("Nav_" + menuNames[i]);
                    test.log(Status.INFO, "Captured screenshot of: " + menuNames[i]);
                }
                break;
            case "AddCutoffRow":
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
                break;
            case "Update":
                if (menu.equals("StateConfigMenu")) {
                    // Update Min Loan Amount first
                    WebElement minLoanInput = wait.until(ExpectedConditions.visibilityOf(minLoanAmnt));
                    moveToElement(minLoanInput);
                    js.executeScript("arguments[0].scrollIntoView({block:'center'});", minLoanInput);
                    js.executeScript(
                            "arguments[0].value='1500'; arguments[0].dispatchEvent(new Event('input',{bubbles:true}));",
                            minLoanInput
                    );
                    pause(1);
                    moveAndClick(updateState);
                    test.log(Status.INFO, "Updated State Config and clicked Update State");
                } else if (menu.equals("ChannelConfigMenu")) {
                    moveAndClick(updateChannel);
                    test.log(Status.INFO, "Clicked Update Channel");
                }
                break;
        }
    }

    public void moveAndClick(By locator) {
        WebElement el = wait.until(ExpectedConditions.elementToBeClickable(locator));
        js.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
        el.click();
        pause(1);
    }

    public void moveAndClick(WebElement el) {
        wait.until(ExpectedConditions.elementToBeClickable(el));
        js.executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
        el.click();
        pause(1);
    }

    public void moveToElement(WebElement el) {
        Actions actions = new Actions(driver);
        actions.moveToElement(el).pause(Duration.ofMillis(500)).perform();
        pause(1);
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

    public void pause(int seconds) {
        try {
            Thread.sleep(seconds * 1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
        extent.flush();
    }
}
