using System;
using System.Threading.Tasks;
using Android.Graphics;
using Com.Vanstone.Trans.Api;
using Com.Vanstone.Sign;
using System.IO;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text;
using wms_android.shared.Models;
using System.Diagnostics;
using Android.OS;
using ParcelModel = wms_android.shared.Models.Parcel;
using System.Threading;

namespace wms_android.Services
{
    public class SignatureService : ISignatureService
    {
        private bool _isInitialized = false;
        private const int DEFAULT_TIMEOUT = 60; // 60 seconds timeout for signature capture
        private const int DEFAULT_SIGNBOARD_STYLE = 0;
        private const int DEFAULT_RESIGN_COUNT = 3;
        private readonly HttpClient _httpClient;
        private readonly string _apiBaseUrl;

        public SignatureService()
        {
            _httpClient = new HttpClient();
            _apiBaseUrl = "https://wms-api.nidlogistics.co.ke/api"; // Update with your actual API base URL
        }

        public async Task<bool> InitializeSignaturePadAsync()
        {
            try
            {
                if (_isInitialized)
                {
                    System.Diagnostics.Debug.WriteLine("Signature pad already initialized.");
                    return true;
                }

                System.Diagnostics.Debug.WriteLine("Setting up context...");
                var context = Android.App.Application.Context;
                if (context == null)
                {
                    System.Diagnostics.Debug.WriteLine("Error: Application.Context is null. Cannot initialize SystemApi.");
                    return false;
                }

                // Set the context first
                SystemApi.SetContext(context);
                System.Diagnostics.Debug.WriteLine("Context set successfully.");

                System.Diagnostics.Debug.WriteLine("Initializing system API...");
                // Initialize system API with required parameters
                int systemInitResult = SystemApi.SystemInit_Api(0, new byte[0], context);
                if (systemInitResult != 0)
                {
                    System.Diagnostics.Debug.WriteLine($"Failed to initialize system API. Error code: {systemInitResult}");
                    return false;
                }
                System.Diagnostics.Debug.WriteLine("System API initialized successfully.");

                // Add a longer delay after system initialization
                await Task.Delay(2000);

                // Configure signature pad settings
                SignApi.SetSignBoardStyle(DEFAULT_SIGNBOARD_STYLE);
                SignApi.SetResignCount(DEFAULT_RESIGN_COUNT);
                SignApi.IsToastConfirm(true);

                _isInitialized = true;
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error initializing signature pad: {ex.Message}");
                return false;
            }
        }

        public async Task<Bitmap> CaptureSignatureAsync(string signCode)
        {
            if (!_isInitialized)
            {
                throw new InvalidOperationException("Signature pad not initialized. Call InitializeSignaturePadAsync first.");
            }

            var tcs = new TaskCompletionSource<Bitmap>();
            var errorOccurred = false;

            try
            {
                // First try to stop any existing signature session
                try
                {
                    SignApi.StopSign_Api();
                    await Task.Delay(500); // Give it time to clean up
                    System.Diagnostics.Debug.WriteLine("Stopped any existing signature session");
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Warning: Error stopping existing signature session: {ex.Message}");
                }

                System.Diagnostics.Debug.WriteLine($"Starting signature capture with code: {signCode}");
                SignApi.StartSign_Api(DEFAULT_TIMEOUT, signCode, new StartSignListener(
                    onDone: (bytes, bitmap) =>
                    {
                        try
                        {
                            System.Diagnostics.Debug.WriteLine($"Signature captured successfully. Bytes length: {bytes?.Length ?? 0}");
                            tcs.TrySetResult(bitmap);
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error processing signature: {ex.Message}");
                            tcs.TrySetException(ex);
                        }
                        finally
                        {
                            try
                            {
                                SignApi.StopSign_Api();
                                System.Diagnostics.Debug.WriteLine("Signature session stopped successfully after capture");
                            }
                            catch (Exception ex)
                            {
                                System.Diagnostics.Debug.WriteLine($"Error stopping signature session: {ex.Message}");
                            }
                        }
                    },
                    onCancel: () =>
                    {
                        try
                        {
                            SignApi.StopSign_Api();
                            System.Diagnostics.Debug.WriteLine("Signature session cancelled and stopped");
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error stopping signature session after cancel: {ex.Message}");
                        }
                        tcs.TrySetCanceled();
                    },
                    onError: (errorCode, errorMessage) =>
                    {
                        System.Diagnostics.Debug.WriteLine($"Signature error: {errorCode} - {errorMessage}");
                        try
                        {
                            SignApi.StopSign_Api();
                            System.Diagnostics.Debug.WriteLine("Signature session stopped after error");
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error stopping signature session after error: {ex.Message}");
                        }
                        tcs.TrySetException(new Exception($"Signature error: {errorMessage}"));
                    },
                    onTimeout: () =>
                    {
                        try
                        {
                            SignApi.StopSign_Api();
                            System.Diagnostics.Debug.WriteLine("Signature session stopped after timeout");
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error stopping signature session after timeout: {ex.Message}");
                        }
                        tcs.TrySetException(new TimeoutException("Signature capture timed out"));
                    }
                ));

                return await tcs.Task;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error capturing signature: {ex.Message}");
                try
                {
                    SignApi.StopSign_Api();
                    System.Diagnostics.Debug.WriteLine("Signature session stopped after exception");
                }
                catch (Exception stopEx)
                {
                    System.Diagnostics.Debug.WriteLine($"Error stopping signature session after exception: {stopEx.Message}");
                }
                throw;
            }
        }

        public async Task<byte[]> GetSignatureDataAsync()
        {
            try
            {
                return SignApi.GetSignatureCompressData_Api();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error getting signature data: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> SaveSignatureToDatabaseAsync(string waybillNumber, byte[] signatureData)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"Attempting to save signature for waybill: {waybillNumber}");
                
                // First get the parcel ID using the waybill number
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/parcels/waybill/{waybillNumber}");
                if (!response.IsSuccessStatusCode)
                {
                    System.Diagnostics.Debug.WriteLine($"Error getting parcel for waybill {waybillNumber}. Status: {response.StatusCode}");
                    return false;
                }

                var parcel = await response.Content.ReadFromJsonAsync<ParcelModel>();
                if (parcel == null)
                {
                    System.Diagnostics.Debug.WriteLine($"No parcel found for waybill {waybillNumber}");
                    return false;
                }

                System.Diagnostics.Debug.WriteLine($"Found parcel with ID: {parcel.Id}");

                var signatureModel = new
                {
                    SignatureImageData = Convert.ToBase64String(signatureData),
                    SignedBy = "Delivery Agent" // This could be made configurable or passed as a parameter
                };

                var json = JsonSerializer.Serialize(signatureModel);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                System.Diagnostics.Debug.WriteLine("Sending signature data to API...");
                response = await _httpClient.PostAsync($"{_apiBaseUrl}/parcels/{parcel.Id}/signature", content);
                
                var success = response.IsSuccessStatusCode;
                System.Diagnostics.Debug.WriteLine($"Signature save {(success ? "successful" : "failed")}. Status: {response.StatusCode}");
                
                if (!success)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    System.Diagnostics.Debug.WriteLine($"Error response: {errorContent}");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving signature to database: {ex.Message}");
                return false;
            }
        }

        public async Task<byte[]> GetSignatureFromDatabaseAsync(string waybillNumber)
        {
            try
            {
                // First get the parcel ID using the waybill number
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/parcels/waybill/{waybillNumber}");
                if (!response.IsSuccessStatusCode)
                {
                    System.Diagnostics.Debug.WriteLine($"Error getting parcel for waybill {waybillNumber}");
                    return null;
                }

                var parcel = await response.Content.ReadFromJsonAsync<ParcelModel>();
                if (parcel == null)
                {
                    System.Diagnostics.Debug.WriteLine($"No parcel found for waybill {waybillNumber}");
                    return null;
                }

                response = await _httpClient.GetAsync($"{_apiBaseUrl}/parcels/{parcel.Id}/signature");
                if (response.IsSuccessStatusCode)
                {
                    var signatureDto = await response.Content.ReadFromJsonAsync<SignatureDto>();
                    return Convert.FromBase64String(signatureDto.SignatureImageData);
                }
                return null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error retrieving signature from database: {ex.Message}");
                return null;
            }
        }

        public async Task<SignatureData> GetSignatureAsync(int parcelId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/parcels/{parcelId}/signature");
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<SignatureData>();
                }
                return null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error getting signature: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> SaveSignatureAsync(int parcelId, SignatureData signatureData)
        {
            try
            {
                var json = JsonSerializer.Serialize(signatureData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_apiBaseUrl}/parcels/{parcelId}/signature", content);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving signature: {ex.Message}");
                return false;
            }
        }

        private class SignatureDto
        {
            public string SignatureImageData { get; set; }
            public DateTime? SignedAt { get; set; }
            public string SignedBy { get; set; }
        }

        private class StartSignListener : Java.Lang.Object, IStartSignListenner
        {
            private readonly Action<byte[], Bitmap> _onDone;
            private readonly Action _onCancel;
            private readonly Action<int, string> _onError;
            private readonly Action _onTimeout;
            private readonly IBinder _binder;

            public StartSignListener(
                Action<byte[], Bitmap> onDone,
                Action onCancel,
                Action<int, string> onError,
                Action onTimeout)
            {
                _onDone = onDone;
                _onCancel = onCancel;
                _onError = onError;
                _onTimeout = onTimeout;
                _binder = new Binder();
            }

            public void OnDone(byte[] bytes, Bitmap bitmap)
            {
                _onDone?.Invoke(bytes, bitmap);
            }

            public void OnCancle()
            {
                _onCancel?.Invoke();
            }

            public void OnError(int errorCode, string errorMessage)
            {
                _onError?.Invoke(errorCode, errorMessage);
            }

            public void OnTimerOut()
            {
                _onTimeout?.Invoke();
            }

            public IBinder AsBinder()
            {
                return _binder;
            }
        }
    }
} 