using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Threading.Tasks;
using wms_android.shared.Interfaces;
using wms_android.shared.Models;
using wms_android.Interfaces;
using wms_android.Services;
using Microsoft.Maui.Controls; // Needed for IQueryAttributable
using System.Collections.ObjectModel; // Added for ObservableCollection
using System.Linq; // Added for LINQ methods like Sum
using System.Text;
using Microsoft.Maui.Storage;

namespace wms_android.ViewModels
{
    // REMOVED [QueryProperty] attribute
    public partial class DeliveryConfirmationViewModel : ObservableObject, IQueryAttributable // IMPLEMENT IQueryAttributable
    {
        private readonly IParcelService _parcelService;
        private readonly IDialogService _dialogService; // For showing messages
        private readonly IPrinterService _printerService;

        [ObservableProperty]
        private Parcel _parcelToDeliver;

        [ObservableProperty]
        private List<Parcel> _parcelsToDeliverList;

        [ObservableProperty]
        private ObservableCollection<Parcel> _displayParcels = new();

        [ObservableProperty]
        private bool _isMultiParcelMode;
        
        [ObservableProperty]
        private bool _isBusy;
        
        [ObservableProperty]
        private string _statusMessage = "Ready to confirm delivery.";
        
        [ObservableProperty]
        private bool _isProcessingComplete;
        
        [ObservableProperty]
        private bool _canNavigateBack = true;
        
        // Properties derived from ParcelToDeliver for easier binding (optional but can be helpful)
        public string WaybillNumber => IsMultiParcelMode ? DisplayParcels.FirstOrDefault()?.WaybillNumber ?? "N/A" : ParcelToDeliver?.WaybillNumber ?? "N/A";
        public decimal TotalAmount => IsMultiParcelMode ? DisplayParcels.Sum(p => p.TotalAmount) : ParcelToDeliver?.TotalAmount ?? 0;
        private Parcel FirstDisplayParcel => IsMultiParcelMode ? DisplayParcels.FirstOrDefault() : ParcelToDeliver;
        public string PaymentMethod => FirstDisplayParcel?.PaymentMethods ?? "N/A";
        public DateTime CreatedAt => FirstDisplayParcel?.CreatedAt ?? DateTime.MinValue;
        public string Sender => FirstDisplayParcel?.Sender ?? "N/A";
        public string Receiver => FirstDisplayParcel?.Receiver ?? "N/A";
        public string Destination => FirstDisplayParcel?.Destination ?? "N/A";
        public decimal Rate => FirstDisplayParcel?.Rate ?? 0;
        public int Quantity => IsMultiParcelMode ? DisplayParcels.Sum(p => p.Quantity ?? 0) : FirstDisplayParcel?.Quantity ?? 0;
        public string Description => FirstDisplayParcel?.Description ?? "N/A";
        public decimal Amount => IsMultiParcelMode ? DisplayParcels.Sum(p => p.Amount ?? 0) : FirstDisplayParcel?.Amount ?? 0;

        public DeliveryConfirmationViewModel(IParcelService parcelService, IDialogService dialogService, IPrinterService printerService)
        {
            _parcelService = parcelService;
            _dialogService = dialogService;
            _printerService = printerService;

            Debug.WriteLine("DeliveryConfirmationViewModel initialized with IPrinterService");
        }

        // REMOVED OnParcelToDeliverChanged partial method

        // IMPLEMENT ApplyQueryAttributes
        public void ApplyQueryAttributes(IDictionary<string, object> query)
        {
            Debug.WriteLine("DeliveryConfirmationViewModel: ApplyQueryAttributes called");
            
            if (query.TryGetValue("ParcelToDeliver", out var parcelData) && parcelData is Parcel parcel)
            {
                Debug.WriteLine($"DeliveryConfirmationViewModel: Single parcel mode - {parcel.WaybillNumber}");
                ParcelToDeliver = parcel;
                DisplayParcels.Clear();
                DisplayParcels.Add(parcel);
                IsMultiParcelMode = false;
            }
            else if (query.TryGetValue("ParcelsToDeliver", out var parcelsData) && parcelsData is List<Parcel> parcels)
            {
                Debug.WriteLine($"DeliveryConfirmationViewModel: Multi parcel mode - {parcels.Count} parcels");
                ParcelsToDeliverList = parcels;
                DisplayParcels.Clear();
                foreach (var p in parcels)
                {
                    DisplayParcels.Add(p);
                }
                IsMultiParcelMode = true;
            }
            else
            {
                Debug.WriteLine("DeliveryConfirmationViewModel: No valid parcel data received");
            }
            
            // Update all property bindings
            OnPropertyChanged(nameof(WaybillNumber));
            OnPropertyChanged(nameof(TotalAmount));
            OnPropertyChanged(nameof(PaymentMethod));
            OnPropertyChanged(nameof(CreatedAt));
            OnPropertyChanged(nameof(Sender));
            OnPropertyChanged(nameof(Receiver));
            OnPropertyChanged(nameof(Destination));
            OnPropertyChanged(nameof(Rate));
            OnPropertyChanged(nameof(Quantity));
            OnPropertyChanged(nameof(Description));
            OnPropertyChanged(nameof(Amount));
        }

        [RelayCommand]
        private async Task ConfirmDeliveryAndPrintAsync()
        {
            if (IsBusy || !DisplayParcels.Any())
            {
                await _dialogService.ShowAlertAsync("Error", "No parcel data available to confirm.");
                return;
            }

            IsBusy = true;
            StatusMessage = "Processing delivery confirmation...";
            
            List<string> successfulDeliveries = new List<string>();
            List<string> failedDeliveries = new List<string>();
            List<string> successfulPrints = new List<string>();
            List<string> failedPrints = new List<string>();

            foreach (var parcel in DisplayParcels)
            {
                StatusMessage = $"Processing parcel: {parcel.WaybillNumber} / {parcel.Description?.Substring(0, Math.Min(parcel.Description.Length, 10))}... (Printing 2 copies)";
                bool currentParcelPrintSuccess = false;
                bool currentParcelDeliverySuccess = false;

                try
                {
                    Debug.WriteLine($"Starting delivery confirmation for Parcel ID: {parcel.Id}, Waybill: {parcel.WaybillNumber}");
                    
                    // Initialize printer
                    var initialized = await _printerService.InitializePrinterAsync();
                    if (!initialized)
                    {
                        Debug.WriteLine("Failed to initialize printer");
                        failedPrints.Add($"{parcel.WaybillNumber ?? parcel.Id.ToString()} (Printer initialization failed)");
                        continue;
                    }
                    
                    // Build delivery receipt content
                    var receiptContent = BuildDeliveryReceiptContent(parcel);
                    
                    // Print the delivery receipt twice with 1-second pause
                    var firstPrintResult = await _printerService.PrintTextAsync(receiptContent);
                    
                    if (firstPrintResult)
                    {
                        Debug.WriteLine($"First delivery receipt printed successfully for {parcel.WaybillNumber}.");
                        
                        // Wait 1 second before printing the second copy
                        await Task.Delay(1000);
                        
                        // Print the second copy
                        var secondPrintResult = await _printerService.PrintTextAsync(receiptContent);
                        
                        if (secondPrintResult)
                        {
                            Debug.WriteLine($"Second delivery receipt printed successfully for {parcel.WaybillNumber}.");
                        }
                        else
                        {
                            Debug.WriteLine($"Second delivery receipt print failed for {parcel.WaybillNumber}, but first print succeeded.");
                        }
                        
                        currentParcelPrintSuccess = true;
                        successfulPrints.Add(parcel.WaybillNumber ?? parcel.Id.ToString());

                        // Try to print QR code separately if supported
                        if (!string.IsNullOrEmpty(parcel.WaybillNumber))
                        {
                            try
                            {
                                // Check if the service supports QR code printing
                                if (_printerService is VanstonePrinterService vanstonePrinter)
                                {
                                    await vanstonePrinter.PrintQRCodeAsync(parcel.WaybillNumber, 300, 300);
                                }
                                else if (_printerService is CS30PrinterService cs30Printer)
                                {
                                    await cs30Printer.PrintQRCodeAsync(parcel.WaybillNumber, 300, 300);
                                }
                            }
                            catch (Exception qrEx)
                            {
                                Debug.WriteLine($"QR code printing failed for {parcel.WaybillNumber}: {qrEx.Message}");
                                // Continue without QR code
                            }
                        }
                        
                        // Start the print job - try interface method first, then specific implementations
                        try
                        {
                            if (_printerService is AdaptivePrinterService adaptivePrinter)
                            {
                                await adaptivePrinter.StartPrintJobAsync();
                            }
                            else if (_printerService is VanstonePrinterService vanstonePrinter2)
                            {
                                await vanstonePrinter2.StartPrintJobAsync();
                            }
                            else if (_printerService is CS30PrinterService cs30Printer2)
                            {
                                await cs30Printer2.StartPrintJobAsync();
                            }
                        }
                        catch (Exception printJobEx)
                        {
                            Debug.WriteLine($"Error starting print job: {printJobEx.Message}");
                        }

                        try
                        {
                            Debug.WriteLine($"Attempting to mark parcel as delivered - ID: {parcel.Id}, Waybill: {parcel.WaybillNumber}");
                            await _parcelService.UpdateParcelStatusAsync(parcel.Id, ParcelStatus.Delivered); // Mark parcel as delivered
                            Debug.WriteLine($"Parcel {parcel.WaybillNumber} marked as delivered successfully via ParcelService.");
                            currentParcelDeliverySuccess = true;
                            successfulDeliveries.Add(parcel.WaybillNumber ?? parcel.Id.ToString());
                        }
                        catch (Exception deliveryEx)
                        {
                            Debug.WriteLine($"Error marking parcel {parcel.WaybillNumber} as delivered after print: {deliveryEx.Message}");
                            failedDeliveries.Add($"{parcel.WaybillNumber ?? parcel.Id.ToString()} (Delivery Status Update Error: {deliveryEx.Message})");
                        }
                    }
                    else
                    {
                        Debug.WriteLine($"Failed to print first delivery receipt for {parcel.WaybillNumber}.");
                        failedPrints.Add($"{parcel.WaybillNumber ?? parcel.Id.ToString()} (First print failed)");
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Error processing parcel {parcel.WaybillNumber}: {ex.Message}");
                    failedPrints.Add($"{parcel.WaybillNumber ?? parcel.Id.ToString()} (Error: {ex.Message})");
                    failedDeliveries.Add($"{parcel.WaybillNumber ?? parcel.Id.ToString()} (Error: {ex.Message})");
                }
            }

            // Final status update
            StatusMessage = "Processing complete.";
            IsBusy = false;

            // Show results summary
            var summaryMessage = new StringBuilder();
            summaryMessage.AppendLine($"Processing complete:");
            summaryMessage.AppendLine($"✓ Successful prints: {successfulPrints.Count}");
            summaryMessage.AppendLine($"✓ Successful deliveries: {successfulDeliveries.Count}");
            if (failedPrints.Any())
            {
                summaryMessage.AppendLine($"✗ Failed prints: {failedPrints.Count}");
            }
            if (failedDeliveries.Any())
            {
                summaryMessage.AppendLine($"✗ Failed deliveries: {failedDeliveries.Count}");
            }

            IsProcessingComplete = true;
            StatusMessage = "Delivery confirmed successfully. You can now go back.";
            
            await _dialogService.ShowAlertAsync("Delivery Confirmation", summaryMessage.ToString());

            // Don't auto-navigate - let the user choose when to go back
            // The back button should now work properly
        }

        [RelayCommand]
        private async Task NavigateBackAsync()
        {
            try
            {
                CanNavigateBack = false; // Prevent multiple navigation attempts
                Debug.WriteLine("Attempting to navigate back from DeliveryConfirmationView");
                
                // Try Shell navigation first
                if (Shell.Current.Navigation.NavigationStack.Count > 1)
                {
                    await Shell.Current.GoToAsync("..");
                    Debug.WriteLine("Successfully navigated back using Shell.GoToAsync");
                }
                else
                {
                    // Fallback to direct navigation stack manipulation
                    if (Application.Current?.MainPage?.Navigation?.NavigationStack.Count > 1)
                    {
                        await Application.Current.MainPage.Navigation.PopAsync();
                        Debug.WriteLine("Successfully navigated back using Navigation.PopAsync");
                    }
                    else
                    {
                        // Last resort - navigate to dashboard
                        await Shell.Current.GoToAsync("//ClerkDashboardView");
                        Debug.WriteLine("Navigated back to dashboard as fallback");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in NavigateBackAsync: {ex.Message}");
                
                // Ultimate fallback - force navigation to dashboard
                try
                {
                    await Shell.Current.GoToAsync("//ClerkDashboardView");
                    Debug.WriteLine("Force navigated to dashboard after error");
                }
                catch (Exception fallbackEx)
                {
                    Debug.WriteLine($"Even fallback navigation failed: {fallbackEx.Message}");
                }
            }
        }

        private string BuildDeliveryReceiptContent(Parcel parcel)
        {
            // Get the logged-in username
            var username = Preferences.Get("CurrentUsername", "Staff");
            
            var sb = new StringBuilder();
            
            // Header
            sb.AppendLine("        NID Logistics Ltd");
            sb.AppendLine("           0116000004");
            sb.AppendLine("  info@nidlogistics.co.ke");
            sb.AppendLine("    *** DELIVERY RECEIPT ***");
            sb.AppendLine();
            
            // Delivery details
            sb.AppendLine($"Waybill Number: {parcel.WaybillNumber}");
            sb.AppendLine($"Delivered At: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine();
            
            // Parcel details
            sb.AppendLine($"Item: {parcel.Description}");
            sb.AppendLine($"From: {parcel.Sender}");
            sb.AppendLine($"To: {parcel.Receiver}");
            sb.AppendLine($"Destination: {parcel.Destination}");
            sb.AppendLine($"Quantity: {parcel.Quantity}");
            sb.AppendLine($"Rate: Ksh {parcel.Rate:N2}");
            sb.AppendLine($"Amount: Ksh {parcel.Amount:N2}");
            sb.AppendLine($"Total Amount: Ksh {parcel.TotalAmount:N2}");
            sb.AppendLine($"Payment Method: {parcel.PaymentMethods}");
            sb.AppendLine("--------------------------------");
            sb.AppendLine();
            
            // Add the logged-in username
            sb.AppendLine($"Delivered by: {username}");
            sb.AppendLine();
            
            // Disclaimer
            sb.AppendLine("NB:");
            sb.AppendLine("1. Contents not checked.");
            sb.AppendLine("2. Customers are advised to insure");
            sb.AppendLine("   goods if value exceeds Ksh 50,000.");
            sb.AppendLine("3. All mirrors/boards are carried");
            sb.AppendLine("   at owner's risk.");
            sb.AppendLine("4. Cash is not accepted as courier,");
            sb.AppendLine("   and company will not be liable.");
            sb.AppendLine();
            sb.AppendLine("PAYMENT INFO:");
            sb.AppendLine("Paybill: 522533");
            sb.AppendLine("Account: 1329713648");
            sb.AppendLine("Mpesa Till: 4214115");
            sb.AppendLine();
            sb.AppendLine("RECIPIENT CONFIRMATION:");
            sb.AppendLine();
            sb.AppendLine("Signature: _________________");
            sb.AppendLine();
            sb.AppendLine("ID Number: _________________");
            sb.AppendLine();
            
            return sb.ToString();
        }
    }
} 