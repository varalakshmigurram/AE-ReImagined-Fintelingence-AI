
package tests;

import base.BaseTest;
import pages.DashboardPage;
import org.testng.Assert;
import org.testng.annotations.Test;
import utils.RetryAnalyzer;

public class SmokeTests extends BaseTest {

    @Test(retryAnalyzer = RetryAnalyzer.class)
    public void testDashboardLoad() {
        DashboardPage page = new DashboardPage(driver);
        Assert.assertTrue(page.isLoaded());
    }

    @Test
    public void testTitle() {
        Assert.assertTrue(driver.getTitle().length() > 0);
    }
}
