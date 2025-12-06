using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using wms_android.Interfaces;
using wms_android.Services;
using Com.Vanstone.Trans.Api;

namespace wms_android.Utils
{
    /// <summary>
    /// Utility class for printer diagnostics and testing
    /// </summary>
    public static class PrinterDiagnostics
    {
        private const string TAG = "PrinterDiagnostics";
        
        /// <summary>
        /// Run a diagnostic test on the printer to verify it's working correctly
        /// </summary>
        /// <returns>Diagnostic result information</returns>
        public static async Task<DiagnosticResult> RunDiagnosticTest()
        {
            var result = new DiagnosticResult();
            result.DeviceModel = Android.OS.Build.Model;
            result.StartedAt = DateTime.Now;
            
            try
            {
                Debug.WriteLine($"{TAG}: Starting printer diagnostic test");
                
                // 1. Check if printer is initialized
                result.InitializationStatus = PrinterInitializationService.IsInitialized;
                Debug.WriteLine($"{TAG}: Printer initialized: {result.InitializationStatus}");
                
                if (!result.InitializationStatus)
                {
                    Debug.WriteLine($"{TAG}: Attempting to initialize printer");
                    PrinterInitializationService.Initialize();
                    await Task.Delay(2000); // Give the printer time to initialize
                    result.InitializationStatus = PrinterInitializationService.IsInitialized;
                    Debug.WriteLine($"{TAG}: Printer initialized after attempt: {result.InitializationStatus}");
                    
                    if (!result.InitializationStatus)
                    {
                        result.ErrorMessage = "Failed to initialize printer";
                        result.CompletedAt = DateTime.Now;
                        result.Success = false;
                        return result;
                    }
                }
                
                // 2. Get printer implementation
                var printer = PrinterInitializationService.GetPrinterHelper();
                result.PrinterType = printer?.GetType().Name;
                Debug.WriteLine($"{TAG}: Printer implementation: {result.PrinterType}");
                
                if (printer == null)
                {
                    result.ErrorMessage = "No printer implementation available";
                    result.CompletedAt = DateTime.Now;
                    result.Success = false;
                    return result;
                }
                
                // Check if the printer hardware is available by checking status
                if (printer is VanstonePosApiHelper vanstonePrinter)
                {
                    int statusResult = PrinterApi.PrnStatus_Api();
                    Debug.WriteLine($"{TAG}: Printer status check: {statusResult}");
                    if (statusResult != 0)
                    {
                        result.ErrorMessage = $"Printer hardware not ready. Status code: {statusResult}";
                        result.CompletedAt = DateTime.Now;
                        result.Success = false;
                        return result;
                    }
                }
                
                // 3. Test basic printer functions with delays between operations
                bool alignSuccess = false;
                bool fontSuccess = false;
                bool printSuccess = false;
                bool feedSuccess = false;
                bool startSuccess = false;

                if (printer is IPosApiHelper vPrinter)
                {
                    alignSuccess = TestPrinterOperation(() => vPrinter.PrintSetAlign(1));
                    result.TestResults.Add("Set Alignment", alignSuccess);
                    if (!alignSuccess) result.FailedTests.Add("Set Alignment");
                    await Task.Delay(200);
                    
                    fontSuccess = TestPrinterOperation(() => vPrinter.PrintSetFont(8, 8, 0));
                    result.TestResults.Add("Set Font", fontSuccess);
                    if (!fontSuccess) result.FailedTests.Add("Set Font");
                    await Task.Delay(200);
                    
                    printSuccess = TestPrinterOperation(() => vPrinter.PrintStr("Printer Diagnostic Test\n"));
                    result.TestResults.Add("Print Text", printSuccess);
                    if (!printSuccess) result.FailedTests.Add("Print Text");
                    await Task.Delay(200);
                    
                    feedSuccess = TestPrinterOperation(() => vPrinter.PrintFeedPaper(50));
                    result.TestResults.Add("Feed Paper", feedSuccess);
                    if (!feedSuccess) result.FailedTests.Add("Feed Paper");
                    await Task.Delay(200);
                    
                    // 4. Start printing
                    startSuccess = TestPrinterOperation(() => vPrinter.PrintStart());
                    result.TestResults.Add("Print Start", startSuccess);
                    if (!startSuccess) result.FailedTests.Add("Print Start");
                }
                else if (printer is ICs30PosApi cs30Printer)
                {
                    alignSuccess = TestPrinterOperation(() => cs30Printer.PrintSetAlign(1));
                    result.TestResults.Add("Set Alignment", alignSuccess);
                    if (!alignSuccess) result.FailedTests.Add("Set Alignment");
                    await Task.Delay(200);
                    
                    fontSuccess = TestPrinterOperation(() => cs30Printer.PrintSetFont(8, 8, 0));
                    result.TestResults.Add("Set Font", fontSuccess);
                    if (!fontSuccess) result.FailedTests.Add("Set Font");
                    await Task.Delay(200);
                    
                    printSuccess = TestPrinterOperation(() => cs30Printer.PrintStr("Printer Diagnostic Test\n"));
                    result.TestResults.Add("Print Text", printSuccess);
                    if (!printSuccess) result.FailedTests.Add("Print Text");
                    await Task.Delay(200);
                    
                    feedSuccess = TestPrinterOperation(() => cs30Printer.PrintFeedPaper(50));
                    result.TestResults.Add("Feed Paper", feedSuccess);
                    if (!feedSuccess) result.FailedTests.Add("Feed Paper");
                    await Task.Delay(200);
                    
                    // 4. Start printing
                    startSuccess = TestPrinterOperation(() => cs30Printer.PrintStart());
                    result.TestResults.Add("Print Start", startSuccess);
                    if (!startSuccess) result.FailedTests.Add("Print Start");
                }
                else
                {
                    result.ErrorMessage = "Unknown printer type";
                    result.Success = false;
                    result.CompletedAt = DateTime.Now;
                    return result;
                }
                
                result.Success = !result.TestResults.ContainsValue(false);
                result.CompletedAt = DateTime.Now;
                
                if (!result.Success)
                {
                    result.ErrorMessage = $"Failed tests: {string.Join(", ", result.FailedTests)}";
                }
                
                Debug.WriteLine($"{TAG}: Diagnostic test completed. Success: {result.Success}");
                if (!result.Success)
                {
                    Debug.WriteLine($"{TAG}: Failed tests: {string.Join(", ", result.FailedTests)}");
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"{TAG}: Error during diagnostic test: {ex.Message}");
                Debug.WriteLine($"{TAG}: Stack trace: {ex.StackTrace}");
                result.Success = false;
                result.ErrorMessage = $"Exception: {ex.Message}";
                result.CompletedAt = DateTime.Now;
            }
            
            return result;
        }
        
        /// <summary>
        /// Reset the printer in case of problems
        /// </summary>
        /// <returns>True if reset was successful</returns>
        public static bool ResetPrinter()
        {
            try
            {
                Debug.WriteLine($"{TAG}: Resetting printer");
                return PrinterInitializationService.ResetPrinter();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"{TAG}: Error resetting printer: {ex.Message}");
                Debug.WriteLine($"{TAG}: Stack trace: {ex.StackTrace}");
                return false;
            }
        }
        
        /// <summary>
        /// Print a test page to verify basic printer functionality
        /// </summary>
        /// <returns>True if successful</returns>
        public static async Task<bool> PrintTestPage()
        {
            try
            {
                Debug.WriteLine($"{TAG}: Printing test page");
                
                // Get printer implementation
                var printer = PrinterInitializationService.GetPrinterHelper();
                
                if (printer == null)
                {
                    Debug.WriteLine($"{TAG}: No printer implementation available");
                    return false;
                }
                
                // Set default font - this will apply device-specific settings
                if (printer is IPosApiHelper vPrinter)
                {
                    vPrinter.SetDefaultFont();
                    
                    // Set alignment for header
                    vPrinter.PrintSetAlign(1);
                    
                    // Use bold style for header
                    if (Android.OS.Build.Model.ToUpper().Contains("A90"))
                    {
                        // A90 device - use same size as default font but with bold style
                        PrinterApi.PrnFontSet_Api(24, 24, 0x33); // Bold
                    }
                    else
                    {
                        // Other devices
                        vPrinter.PrintSetFont(8, 8, 0x33); // Bold
                    }
                    
                    // Print header
                    vPrinter.PrintStr("Printer Test Page\n");
                    
                    // Reset to device-appropriate font
                    vPrinter.SetDefaultFont();
                    
                    // Print system info
                    vPrinter.PrintStr($"Date: {DateTime.Now}\n");
                    vPrinter.PrintStr($"Device Model: {Android.OS.Build.Model}\n");
                    vPrinter.PrintStr($"Android Version: {Android.OS.Build.VERSION.Release}\n");
                    vPrinter.PrintStr($"Printer Type: {printer.GetType().Name}\n");
                    
                    // Left alignment
                    vPrinter.PrintSetAlign(0);
                    
                    // Print test patterns
                    vPrinter.PrintStr("--- Text Formatting Test ---\n");
                    
                    // Font styles - try different options
                    vPrinter.SetDefaultFont(); // Reset to device-appropriate font
                    vPrinter.PrintStr("Default Font\n");
                    
                    // Bold text
                    if (Android.OS.Build.Model.ToUpper().Contains("A90"))
                    {
                        PrinterApi.PrnFontSet_Api(24, 24, 0x33); // Bold
                    }
                    else
                    {
                        vPrinter.PrintSetFont(8, 8, 0x33); // Bold
                    }
                    vPrinter.PrintStr("Bold Text\n");
                    
                    // Reset to device-appropriate font for remainder of test
                    vPrinter.SetDefaultFont();
                    
                    // Alignments
                    vPrinter.PrintStr("--- Alignment Test ---\n");
                    
                    vPrinter.PrintSetAlign(0);
                    vPrinter.PrintStr("Left aligned\n");
                    
                    vPrinter.PrintSetAlign(1);
                    vPrinter.PrintStr("Center aligned\n");
                    
                    vPrinter.PrintSetAlign(2);
                    vPrinter.PrintStr("Right aligned\n");
                    
                    // QR code
                    vPrinter.PrintSetAlign(1);
                    vPrinter.PrintStr("--- QR Code Test ---\n");
                    vPrinter.PrintQrCode_Cut("https://nidlogistics.co.ke", 200, 200, "QR_CODE");
                    
                    // Feed paper
                    vPrinter.PrintFeedPaper(100);
                    
                    // Start printing
                    int result = vPrinter.PrintStart();
                    
                    Debug.WriteLine($"{TAG}: Test page print result: {result}");
                    return result == 0;
                }
                else if (printer is ICs30PosApi cs30Printer)
                {
                    cs30Printer.SetDefaultFont(); // CS30 returns int but we ignore it here
                    
                    // Set alignment for header
                    cs30Printer.PrintSetAlign(1);
                    
                    // Use bold style for header
                    cs30Printer.PrintSetFont(8, 8, 0x33); // Bold
                    
                    // Print header
                    cs30Printer.PrintStr("Printer Test Page\n");
                    
                    // Reset to device-appropriate font
                    cs30Printer.SetDefaultFont(); // CS30 returns int but we ignore it here
                    
                    // Print system info
                    cs30Printer.PrintStr($"Date: {DateTime.Now}\n");
                    cs30Printer.PrintStr($"Device Model: {Android.OS.Build.Model}\n");
                    cs30Printer.PrintStr($"Android Version: {Android.OS.Build.VERSION.Release}\n");
                    cs30Printer.PrintStr($"Printer Type: {printer.GetType().Name}\n");
                    
                    // Left alignment
                    cs30Printer.PrintSetAlign(0);
                    
                    // Print test patterns
                    cs30Printer.PrintStr("--- Text Formatting Test ---\n");
                    
                    // Font styles - try different options
                    cs30Printer.SetDefaultFont(); // CS30 returns int but we ignore it here 
                    cs30Printer.PrintStr("Default Font\n");
                    
                    // Bold text
                    cs30Printer.PrintSetFont(8, 8, 0x33); // Bold
                    cs30Printer.PrintStr("Bold Text\n");
                    
                    // Reset to device-appropriate font for remainder of test
                    cs30Printer.SetDefaultFont(); // CS30 returns int but we ignore it here
                    
                    // Alignments
                    cs30Printer.PrintStr("--- Alignment Test ---\n");
                    
                    cs30Printer.PrintSetAlign(0);
                    cs30Printer.PrintStr("Left aligned\n");
                    
                    cs30Printer.PrintSetAlign(1);
                    cs30Printer.PrintStr("Center aligned\n");
                    
                    cs30Printer.PrintSetAlign(2);
                    cs30Printer.PrintStr("Right aligned\n");
                    
                    // QR code
                    cs30Printer.PrintSetAlign(1);
                    cs30Printer.PrintStr("--- QR Code Test ---\n");
                    cs30Printer.PrintQrCode("https://nidlogistics.co.ke", 200, 200); // CS30 uses 3-parameter method
                    
                    // Feed paper
                    cs30Printer.PrintFeedPaper(100);
                    
                    // Start printing
                    int result = cs30Printer.PrintStart();
                    
                    Debug.WriteLine($"{TAG}: Test page print result: {result}");
                    return result == 0;
                }
                else
                {
                    Debug.WriteLine($"{TAG}: Unknown printer type: {printer?.GetType().Name}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"{TAG}: Error printing test page: {ex.Message}");
                Debug.WriteLine($"{TAG}: Stack trace: {ex.StackTrace}");
                return false;
            }
        }
        
        /// <summary>
        /// Test a printer operation and return success/failure
        /// </summary>
        private static bool TestPrinterOperation(Func<int> operation)
        {
            try
            {
                int result = operation();
                Debug.WriteLine($"{TAG}: Operation result code: {result}");
                if (result != 0)
                {
                    Debug.WriteLine($"{TAG}: Operation failed with code: {result}");
                    if (result == -100)
                    {
                        Debug.WriteLine($"{TAG}: Printer not initialized properly");
                    }
                    else if (result < 0)
                    {
                        Debug.WriteLine($"{TAG}: Error code indicates hardware/communication issue");
                    }
                }
                return result == 0;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"{TAG}: Exception during printer operation: {ex.Message}");
                Debug.WriteLine($"{TAG}: Stack trace: {ex.StackTrace}");
                return false;
            }
        }
    }
    
    /// <summary>
    /// Result of printer diagnostic test
    /// </summary>
    public class DiagnosticResult
    {
        public DiagnosticResult()
        {
            TestResults = new System.Collections.Generic.Dictionary<string, bool>();
            FailedTests = new System.Collections.Generic.List<string>();
        }
        
        // Basic information
        public string DeviceModel { get; set; }
        public string PrinterType { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        
        // Test results
        public bool InitializationStatus { get; set; }
        public System.Collections.Generic.Dictionary<string, bool> TestResults { get; set; }
        public System.Collections.Generic.List<string> FailedTests { get; set; }
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        
        public override string ToString()
        {
            return $"Diagnostic Result:\n" +
                   $"Device: {DeviceModel}\n" +
                   $"Printer: {PrinterType}\n" +
                   $"Initialized: {InitializationStatus}\n" +
                   $"Success: {Success}\n" +
                   $"Error: {ErrorMessage ?? "None"}\n" +
                   $"Failed Tests: {(FailedTests.Count > 0 ? string.Join(", ", FailedTests) : "None")}\n" +
                   $"Started: {StartedAt}\n" +
                   $"Completed: {CompletedAt}\n" +
                   $"Duration: {(CompletedAt - StartedAt).TotalSeconds:0.00}s";
        }
    }
} 