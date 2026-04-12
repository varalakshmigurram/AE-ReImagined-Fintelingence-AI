package tests;

import base.BaseTest;
import org.testng.annotations.Test;
import pages.RulesPage;

public class RulesTest extends BaseTest {

    @Test
    public void testRuleClick() {
        RulesPage page = new RulesPage(driver);
        page.clickRulesMenu();
        System.out.println("RulePage executed successfully");
    }
}