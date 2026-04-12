package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;


public class RulesPage  {

    WebDriver driver;
    WebDriverWait wait;

    public RulesPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Sidebar Rules
    By rulesMenu = By.xpath("//span[text()='Rules']");

//    // Rule name
//    By rule = By.xpath("//*[contains(text(),'AE_INVALID_STATE')]");

    // Edit button (first row)
    By editButton = By.xpath("(//div[@class='row-actions']//button[@title='Edit'])[1]");

    // Cancel button (modal)
    By cancelButton = By.xpath("//button[text()='Cancel']");

    public void clickRulesMenu() {

        wait.until(ExpectedConditions.elementToBeClickable(rulesMenu)).click();
        System.out.println("Clicked Rules Option");
        pause(2);
        wait.until(ExpectedConditions.elementToBeClickable(editButton)).click();
        System.out.println("Clicked Edit");
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

//    public void clickRule() {
//        wait.until(ExpectedConditions.elementToBeClickable(rule)).click();
//    }

}