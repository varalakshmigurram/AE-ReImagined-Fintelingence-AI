package utils;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class ExcelReader {

    public static Object[][] readTestData(String filePath, String sheetName) throws IOException {
        List<Object[]> data = new ArrayList<>();
        
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            boolean headerSkipped = false;
            
            while ((line = br.readLine()) != null) {
                if (!headerSkipped) {
                    headerSkipped = true; // Skip header row
                    continue;
                }
                
                // Split by comma and handle quoted values
                String[] values = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                List<String> rowData = new ArrayList<>();
                
                for (String value : values) {
                    // Remove quotes if present
                    String cleanValue = value.trim().replaceAll("^\"|\"$", "");
                    rowData.add(cleanValue);
                }
                
                data.add(rowData.toArray());
            }
        }
        
        return data.toArray(new Object[0][]);
    }
}
