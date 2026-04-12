
package pages;

import org.openqa.selenium.*;

public class DashboardPage {
    WebDriver driver;

    public DashboardPage(WebDriver driver) {
        this.driver = driver;
    }

    By header = By.tagName("h1");

    public boolean isLoaded() {
        return driver.findElement(header).isDisplayed();
    }
}
