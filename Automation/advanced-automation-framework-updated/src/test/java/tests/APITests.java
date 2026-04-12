
package tests;

import io.restassured.RestAssured;
import org.testng.annotations.Test;

public class APITests {

    @Test
    public void testAPIHealth() {
        RestAssured.get("http://localhost:8080/actuator/health")
                .then().statusCode(200);
    }
}
