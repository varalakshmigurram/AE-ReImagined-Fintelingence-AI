package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;


public class StateConfigPage  {

    WebDriver driver;
    WebDriverWait wait;

    public StateConfigPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Sidebar Rules
    By StateConfigMenu = By.xpath("//span[text()='State Config']");

    // Edit button (first state)
    By editButton =  By.xpath("//div[contains(@class,'card')][.//text()[normalize-space()='AK']]//button[contains(.,'Edit')]");

    // minLoan amnt button
    By minLoanAmnt = By.xpath("//label[contains(text(),'Min Loan Amount')]/following::input[1]");

    // Cancel button
    By cancelButton = By.xpath("//button[text()='Cancel']");

    public void clickStateConfigMenu() {
        wait.until(ExpectedConditions.elementToBeClickable(StateConfigMenu)).click();
        System.out.println("Clicked Rules");
        pause(2);
        wait.until(ExpectedConditions.elementToBeClickable(editButton)).click();
        System.out.println("Clicked Edit");
        pause(2);
        wait.until(ExpectedConditions.elementToBeClickable(minLoanAmnt)).click();
        JavascriptExecutor js = (JavascriptExecutor) driver;
//        js.executeScript("arguments[0].value='1500';", minLoanAmnt);
        System.out.println("Clicked minLoanAmnt");
        js.executeScript("window.scrollBy(0,300);");  // scroll down 300px
        pause(2);
        wait.until(ExpectedConditions.elementToBeClickable(cancelButton)).click();
        System.out.println("Clicked Cancel");
        pause(2);
    }

    public void pause(int seconds) {
        try {
            Thread.sleep(seconds * 1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

}