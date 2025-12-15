using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Collections.Generic;
using wms_android.shared.Interfaces;
using wms_android.shared.Models;
using Newtonsoft.Json;
using System.Diagnostics;
using Newtonsoft.Json.Linq;

namespace wms_android.shared.Services
{
    public class SmsService : ISmsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _server;
        private readonly string _userId;
        private readonly string _password;
        private readonly string _senderName;
        private readonly IParcelService _parcelService;
        
        // Separate trackers for different notification types
        private readonly HashSet<Guid> _sentPickupNotifications = new HashSet<Guid>();
        private readonly HashSet<Guid> _sentDeliveryNotifications = new HashSet<Guid>();

        public SmsService(IParcelService parcelService = null)
        {
            _httpClient = new HttpClient();
            _parcelService = parcelService;
            
            // Load the SMS API credentials from app settings
            _server = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";
            _userId = "nidlogistics1";  // NID Logistics credentials
            _password = "hqvu69ND";
            _senderName = "NID_LOG_LTD";  // NID Logistics sender ID
            
            Debug.WriteLine("SMS Service initialized with NID_LOG_LTD sender ID");
        }

        /// <summary>
        /// Sends an SMS message to the specified phone number
        /// </summary>
        public async Task<bool> SendSmsAsync(string phoneNumber, string message)
        {
            try
            {
                Debug.WriteLine($"Attempting to send SMS to {phoneNumber}");
                
                // Ensure phone number is in the correct format (should start with country code)
                if (!phoneNumber.StartsWith("+"))
                {
                    // Convert to international format
                    if (phoneNumber.StartsWith("0"))
                    {
                        phoneNumber = "+254" + phoneNumber.Substring(1);
                    }
                    else
                    {
                        // Assume it's already without the leading zero but needs country code
                        phoneNumber = "+254" + phoneNumber;
                    }
                }
                
                Debug.WriteLine($"Formatted phone number: {phoneNumber}");
                Debug.WriteLine($"Message to send: {message}");

                // Set shorter timeout for faster feedback
                _httpClient.Timeout = TimeSpan.FromSeconds(10);
                
                // Create a unique identifier for this message to aid in debugging
                string messageId = Guid.NewGuid().ToString().Substring(0, 8);
                Debug.WriteLine($"[MSG-{messageId}] Starting SMS send process");
                
                // Try the form URL encoded approach first - this is the recommended approach based on API docs
                Debug.WriteLine($"[MSG-{messageId}] Trying the form-encoded approach first (recommended by API docs)");
                var successForm = await TryFormUrlEncodedApproach(phoneNumber, message);
                if (successForm)
                {
                    Debug.WriteLine($"[MSG-{messageId}] SMS sent successfully using form approach");
                    return true;
                }
                
                // If form approach didn't work, try JSON
                Debug.WriteLine($"[MSG-{messageId}] Form approach failed, trying JSON approach");
                var successJson = await TryJsonBodyApproach(phoneNumber, message);
                if (successJson)
                {
                    Debug.WriteLine($"[MSG-{messageId}] SMS sent successfully using JSON approach");
                    return true;
                }
                
                // Finally try query parameters as last resort
                Debug.WriteLine($"[MSG-{messageId}] JSON approach failed, trying query parameters approach");
                var successQuery = await TryQueryParameterApproach(phoneNumber, message);
                if (successQuery)
                {
                    Debug.WriteLine($"[MSG-{messageId}] SMS sent successfully using query parameters approach");
                    return true;
                }
                
                // All approaches failed
                Debug.WriteLine($"[MSG-{messageId}] All SMS sending approaches failed");
                return false;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Exception in SendSmsAsync: {ex.Message}");
                Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Debug.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                return false;
            }
        }
        
        /// <summary>
        /// Try sending SMS using query parameters in a GET request
        /// </summary>
        private async Task<bool> TryQueryParameterApproach(string phoneNumber, string message)
        {
            Debug.WriteLine("Trying GET request with query parameters approach");
            var queryString = $"?userid={_userId}&password={_password}&mobile={phoneNumber}&msg={Uri.EscapeDataString(message)}&senderid={_senderName}&msgType=text&sendMethod=quick&duplicateCheck=true&output=json";
            
            string[] endpoints = {
                "https://smsportal.hostpinnacle.co.ke/SMSApi/send",
                "https://smsportal.hostpinnacle.co.ke/SMSApi"
            };
            
            foreach (var endpoint in endpoints)
            {
                try
                {
                    Debug.WriteLine($"Trying GET endpoint: {endpoint}");
                    var fullUrl = endpoint + queryString;
                    
                    var response = await _httpClient.GetAsync(fullUrl);
                    var responseContent = await response.Content.ReadAsStringAsync();
                    Debug.WriteLine($"GET response ({response.StatusCode}): {responseContent}");
                    
                    if (response.IsSuccessStatusCode)
                    {
                        // Check actual API response status (not just HTTP status)
                        try
                        {
                            // First check if we got a valid response at all
                            if (!string.IsNullOrEmpty(responseContent))
                            {
                                // Parse response manually with proper case sensitivity
                                dynamic apiResponse = JsonConvert.DeserializeObject<dynamic>(responseContent);

                                // Extract status - try multiple possible property names with different casings
                                string status = null;
                                string statusCode = null;
                                string reason = null;

                                // Check for status fields with various casings
                                if (((JObject)apiResponse).TryGetValue("status", StringComparison.OrdinalIgnoreCase, out JToken statusToken))
                                {
                                    status = statusToken.ToString();
                                }
                                
                                if (((JObject)apiResponse).TryGetValue("statusCode", StringComparison.OrdinalIgnoreCase, out JToken statusCodeToken))
                                {
                                    statusCode = statusCodeToken.ToString();
                                }
                                
                                if (((JObject)apiResponse).TryGetValue("reason", StringComparison.OrdinalIgnoreCase, out JToken reasonToken))
                                {
                                    reason = reasonToken.ToString();
                                }

                                Debug.WriteLine($"Extracted values - status: {status}, statusCode: {statusCode}, reason: {reason}");

                                // Check for success - either status=success or statusCode=200
                                if ((status != null && status.Equals("success", StringComparison.OrdinalIgnoreCase)) ||
                                    (statusCode != null && statusCode.Equals("200", StringComparison.OrdinalIgnoreCase)))
                            {
                                Debug.WriteLine("GET request succeeded with API status success");
                                return true;
                                }
                                else
                                {
                                    Debug.WriteLine($"GET request failed despite HTTP 200: {reason ?? "Unknown error"}");
                                }
                            }
                            else
                            {
                                // If we received an empty response with HTTP 200, assume success
                                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                                {
                                    Debug.WriteLine("GET request succeeded with empty response but HTTP 200");
                                    return true;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Error parsing GET response: {ex.Message}");
                            
                            // If parsing failed but HTTP status is success, still return true
                            if (response.StatusCode == System.Net.HttpStatusCode.OK)
                            {
                                Debug.WriteLine("Despite parsing error, HTTP status is 200. Assuming success.");
                                return true;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"GET request failed: {ex.Message}");
                }
            }
            
            Debug.WriteLine("All GET attempts failed");
            return false;
        }
        
        /// <summary>
        /// Try sending SMS using form URL encoded data in a POST request
        /// </summary>
        private async Task<bool> TryFormUrlEncodedApproach(string phoneNumber, string message)
        {
            Debug.WriteLine("Trying POST request with form URL encoded data approach");
            
            // Using case-sensitive parameters to match the API documentation exactly
            var formContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("userid", _userId),
                new KeyValuePair<string, string>("password", _password),
                new KeyValuePair<string, string>("mobile", phoneNumber),
                new KeyValuePair<string, string>("msg", message),
                new KeyValuePair<string, string>("senderid", _senderName),
                new KeyValuePair<string, string>("msgType", "text"),
                new KeyValuePair<string, string>("sendMethod", "quick"),
                new KeyValuePair<string, string>("duplicateCheck", "true"),  // Changed from duplicatecheck to duplicateCheck based on API docs
                new KeyValuePair<string, string>("output", "json")
            });
            
            string endpoint = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";
            
            try
            {
                Debug.WriteLine($"Trying form POST endpoint with correct parameters: {endpoint}");
                Debug.WriteLine($"Request parameters: userid={_userId}, mobile={phoneNumber}, senderid={_senderName}, msgType=text, sendMethod=quick, duplicateCheck=true");
                
                var response = await _httpClient.PostAsync(endpoint, formContent);
                var responseContent = await response.Content.ReadAsStringAsync();
                Debug.WriteLine($"Form POST response ({response.StatusCode}): {responseContent}");
                
                if (response.IsSuccessStatusCode)
                {
                    // Check actual API response status (not just HTTP status)
                    try
                    {
                        // First check if we got a valid response at all
                        if (!string.IsNullOrEmpty(responseContent))
                        {
                            // Parse response manually with proper case sensitivity
                            dynamic apiResponse = JsonConvert.DeserializeObject<dynamic>(responseContent);

                            // Extract status - try multiple possible property names with different casings
                            string status = null;
                            string statusCode = null;
                            string reason = null;

                            // Check for status fields with various casings
                            if (((JObject)apiResponse).TryGetValue("status", StringComparison.OrdinalIgnoreCase, out JToken statusToken))
                            {
                                status = statusToken.ToString();
                            }
                            
                            if (((JObject)apiResponse).TryGetValue("statusCode", StringComparison.OrdinalIgnoreCase, out JToken statusCodeToken))
                            {
                                statusCode = statusCodeToken.ToString();
                            }
                            
                            if (((JObject)apiResponse).TryGetValue("reason", StringComparison.OrdinalIgnoreCase, out JToken reasonToken))
                            {
                                reason = reasonToken.ToString();
                            }

                            Debug.WriteLine($"Extracted values - status: {status}, statusCode: {statusCode}, reason: {reason}");

                            // Check for success - either status=success or statusCode=200
                            if ((status != null && status.Equals("success", StringComparison.OrdinalIgnoreCase)) ||
                                (statusCode != null && statusCode.Equals("200", StringComparison.OrdinalIgnoreCase)))
                        {
                            Debug.WriteLine("Form POST request succeeded with API status success");
                            return true;
                            }
                            else
                            {
                                Debug.WriteLine($"Form POST request failed despite HTTP 200: {reason ?? "Unknown error"}");
                            }
                        }
                        else
                        {
                            // If we received an empty response with HTTP 200, assume success
                            if (response.StatusCode == System.Net.HttpStatusCode.OK)
                            {
                                Debug.WriteLine("Form POST request succeeded with empty response but HTTP 200");
                                return true;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Error parsing form POST response: {ex.Message}");
                        
                        // If parsing failed but HTTP status is success, still return true
                        if (response.StatusCode == System.Net.HttpStatusCode.OK)
                        {
                            Debug.WriteLine("Despite parsing error, HTTP status is 200. Assuming success.");
                            return true;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Form POST request failed: {ex.Message}");
            }
            
            Debug.WriteLine("Form URL encoded approach failed");
            return false;
        }
        
        /// <summary>
        /// Try sending SMS using JSON body in a POST request
        /// </summary>
        private async Task<bool> TryJsonBodyApproach(string phoneNumber, string message)
        {
            Debug.WriteLine("Trying POST request with JSON body approach");
            
            // Try multiple possible JSON structures (API documentation may vary)
            var jsonStructures = new List<object>
            {
                // Structure 1: Direct properties
                new
                {
                    userid = _userId,
                    password = _password,
                    mobile = phoneNumber,
                    msg = message,
                    senderid = _senderName,
                    msgType = "text",
                    sendMethod = "quick",
                    duplicateCheck = "true",
                    output = "json"
                },
                
                // Structure 2: Message property with nested details
                new
                {
                    auth = new { userid = _userId, password = _password },
                    message = new
                    {
                        sender = _senderName,
                        recipient = phoneNumber,
                        text = message,
                        type = "text"
                    },
                    options = new { output = "json", duplicateCheck = "true" }
                }
            };
            
            string endpoint = "https://smsportal.hostpinnacle.co.ke/SMSApi/send";
            
            foreach (var jsonStructure in jsonStructures)
            {
                try
                {
                    Debug.WriteLine($"Trying JSON POST endpoint: {endpoint}");
                    var jsonString = JsonConvert.SerializeObject(jsonStructure);
                    Debug.WriteLine($"JSON payload: {jsonString}");
                    
                    var content = new StringContent(jsonString, Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync(endpoint, content);
                    var responseContent = await response.Content.ReadAsStringAsync();
                    Debug.WriteLine($"JSON POST response ({response.StatusCode}): {responseContent}");
                    
                    if (response.IsSuccessStatusCode)
                    {
                        // Check actual API response status (not just HTTP status)
                        try
                        {
                            // First check if we got a valid response at all
                            if (!string.IsNullOrEmpty(responseContent))
                            {
                                // Parse response manually with proper case sensitivity
                                dynamic apiResponse = JsonConvert.DeserializeObject<dynamic>(responseContent);

                                // Extract status - try multiple possible property names with different casings
                                string status = null;
                                string statusCode = null;
                                string reason = null;

                                // Check for status fields with various casings
                                if (((JObject)apiResponse).TryGetValue("status", StringComparison.OrdinalIgnoreCase, out JToken statusToken))
                                {
                                    status = statusToken.ToString();
                                }
                                
                                if (((JObject)apiResponse).TryGetValue("statusCode", StringComparison.OrdinalIgnoreCase, out JToken statusCodeToken))
                                {
                                    statusCode = statusCodeToken.ToString();
                                }
                                
                                if (((JObject)apiResponse).TryGetValue("reason", StringComparison.OrdinalIgnoreCase, out JToken reasonToken))
                                {
                                    reason = reasonToken.ToString();
                                }

                                Debug.WriteLine($"Extracted values - status: {status}, statusCode: {statusCode}, reason: {reason}");

                                // Check for success - either status=success or statusCode=200
                                if ((status != null && status.Equals("success", StringComparison.OrdinalIgnoreCase)) ||
                                    (statusCode != null && statusCode.Equals("200", StringComparison.OrdinalIgnoreCase)))
                            {
                                Debug.WriteLine("JSON POST request succeeded with API status success");
                                return true;
                                }
                                else
                                {
                                    Debug.WriteLine($"JSON POST request failed despite HTTP 200: {reason ?? "Unknown error"}");
                                }
                            }
                            else
                            {
                                // If we received an empty response with HTTP 200/204, assume success
                                if (response.StatusCode == System.Net.HttpStatusCode.OK || 
                                    response.StatusCode == System.Net.HttpStatusCode.NoContent)
                                {
                                    Debug.WriteLine("JSON POST request succeeded with empty response but success HTTP status");
                                    return true;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Error parsing JSON POST response: {ex.Message}");
                            
                            // If parsing failed but HTTP status is success, still return true
                            if (response.StatusCode == System.Net.HttpStatusCode.OK || 
                                response.StatusCode == System.Net.HttpStatusCode.NoContent)
                            {
                                Debug.WriteLine("Despite parsing error, HTTP status is success. Assuming success.");
                                return true;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"JSON POST request failed: {ex.Message}");
                }
            }
            
            Debug.WriteLine("All JSON approach attempts failed");
            return false;
        }
        
        public async Task<bool> SendParcelPickupNotificationAsync(
            string receiverPhone,
            string receiverName,
            string senderName,
            string senderPhone,
            int quantity,
            string destination,
            decimal amount,
            string paymentMethod,
            string waybillNumber)
        {
            // Format a nice SMS message with the parcel details
            var message = $"Dear {receiverName}, you have {quantity} parcel(s) sent by {senderName} ({senderPhone}) to {destination}. " +
                          $"Amount: KES {amount}. Payment Method: {paymentMethod}. Tracking: {waybillNumber}. " +
                          $"For inquiries call 0116000004. Thank you for choosing NID Logistics.";
            
            return await SendSmsAsync(receiverPhone, message);
        }
        
        /// <summary>
        /// Sends a templated SMS notification for parcel pickup with format based on payment method
        /// </summary>
        /// <param name="parcel">The parcel to send notification for</param>
        /// <returns>True if message was sent successfully, false otherwise</returns>
        public async Task<bool> SendTemplatedParcelNotificationAsync(Parcel parcel)
        {
            if (parcel == null)
            {
                Debug.WriteLine("Cannot send SMS for null parcel");
                return false;
            }
            
            // Check if we've already sent a notification for this parcel at the service level
            if (_sentPickupNotifications.Contains(parcel.Id))
            {
                Debug.WriteLine($"Skipping duplicate SMS notification for parcel {parcel.Id} (tracked in SmsService)");
                return true; // Return true to indicate "success" since we're intentionally skipping
            }
            
            // Also check with the ParcelService if it's tracking this notification
            if (_parcelService != null && await _parcelService.CheckSmsNotificationSentAsync(parcel.Id))
            {
                Debug.WriteLine($"Skipping duplicate SMS notification for parcel {parcel.Id} (tracked in ParcelService)");
                return true; // Return true since we're intentionally skipping
            }
            
            // Generate the message using the template service
            string message = SmsTemplateService.GeneratePickupNotification(parcel);
            
            if (string.IsNullOrEmpty(message))
            {
                Debug.WriteLine("Cannot send empty SMS message");
                return false;
            }
            
            Debug.WriteLine($"Sending templated SMS to {parcel.ReceiverTelephone} with payment method {parcel.PaymentMethods}");
            Debug.WriteLine($"SMS Content: {message}");
            
            // Send the message
            bool result = await SendSmsAsync(parcel.ReceiverTelephone, message);
            
            // If successful, add to our tracking set
            if (result)
            {
                _sentPickupNotifications.Add(parcel.Id);
                Debug.WriteLine($"Added parcel {parcel.Id} to SmsService sent notifications tracking");
                
                // Also update the ParcelService tracking
                if (_parcelService != null)
                {
                    await _parcelService.MarkSmsNotificationSentAsync(parcel.Id);
                    Debug.WriteLine($"Added parcel {parcel.Id} to ParcelService sent notifications tracking");
                }
            }
            
            return result;
        }
        
        /// <summary>
        /// Sends a delivery confirmation SMS to the sender of a parcel
        /// </summary>
        /// <param name="parcel">The parcel that was delivered</param>
        /// <returns>True if message was sent successfully, false otherwise</returns>
        public async Task<bool> SendParcelDeliveryConfirmationAsync(Parcel parcel)
        {
            if (parcel == null)
            {
                Debug.WriteLine("Cannot send delivery confirmation for null parcel");
                return false;
            }
            
            // Check if we've already sent a delivery confirmation for this parcel
            if (_sentDeliveryNotifications.Contains(parcel.Id))
            {
                Debug.WriteLine($"Skipping duplicate delivery SMS for parcel {parcel.Id}");
                return true; // Return true since we're intentionally skipping
            }
            
            // Generate the message using the template service
            string message = SmsTemplateService.GenerateDeliveryConfirmation(parcel);
            
            if (string.IsNullOrEmpty(message))
            {
                Debug.WriteLine("Cannot send empty SMS message");
                return false;
            }
            
            Debug.WriteLine($"Sending delivery confirmation SMS to {parcel.SenderTelephone}");
            Debug.WriteLine($"SMS Content: {message}");
            
            // Send the message to the sender
            bool result = await SendSmsAsync(parcel.SenderTelephone, message);
            
            // If successful, add to our tracking set
            if (result)
            {
                _sentDeliveryNotifications.Add(parcel.Id);
                Debug.WriteLine($"Added parcel {parcel.Id} delivery confirmation to sent notifications tracking");
            }
            
            return result;
        }
    }
} 