package tests;

import base.BaseTest;
import org.testng.annotations.Test;
import pages.StateConfigPage;

public class StateConfigTest extends BaseTest {

    @Test
    public void testStaeConfigClick() {
        StateConfigPage page = new StateConfigPage(driver);
        page.clickStateConfigMenu();
        System.out.println("StateConfigPage executed successfully");
    }
}