using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Microsoft.Maui.Controls;
using Microsoft.EntityFrameworkCore;
using wms_android.shared.Models;
using wms_android.data.Services;
using wms_android.Views;
using wms_android.shared.Interfaces;
using wms_android.Services;
using wms_android.Utils;
using wms_android.Interfaces;

namespace wms_android.ViewModels
{
    public class ParcelsViewModel : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;
        private readonly IParcelService _parcelService;
        private readonly ISmsService _smsService;
        private readonly IPrinterService _printerService;
        private readonly LoadingService _loadingService = LoadingService.Instance;
        private string _waybillNumber;
        public string _sender { get; set; }
        public string _receiver { get; set; }
        public string _senderTelephone { get; set; }
        public string _receiveTelephone { get; set; }
        public object CurrentWaybill { get; private set; }
        public bool IsReturningToView { get; set; } = false;
        private Parcel _currentParcel;

        private int? _currentUserId;
        public int? CurrentUserId 
        { 
            get => _currentUserId; 
            set
            {
                _currentUserId = value;
                OnPropertyChanged(nameof(CurrentUserId));
            }
        }

        public string WaybillNumber
        {
            get => _waybillNumber;
            set
            {
                if (_waybillNumber != value)
                {
                    _waybillNumber = value;
                    OnPropertyChanged(nameof(WaybillNumber));
                }
            }
        }

        public string Sender
        {
            get => _sender;
            set
            {
                if (_sender != value)
                {
                    _sender = value;
                    OnPropertyChanged(nameof(Sender));
                }
            }
        }
        public string Receiver
        {
            get => _receiver;
            set
            {
                if (_receiver != value)
                {
                    _receiver = value;
                    OnPropertyChanged(nameof(Receiver));
                }
            }
        }
        public string SenderTelephone
        {
            get => _senderTelephone;
            set
            {
                if (_senderTelephone != value)
                {
                    _senderTelephone = value;
                    OnPropertyChanged(nameof(SenderTelephone));
                }
            }
        }
        public string ReceiverTelephone
        {
            get => _receiveTelephone;
            set
            {
                if (_receiveTelephone != value)
                {
                    _receiveTelephone = value;
                    OnPropertyChanged(nameof(ReceiverTelephone));
                }
            }
        }

        public Parcel CurrentParcel
        {
            get => _currentParcel;
            set
            {
                if (_currentParcel != value)
                {
                    _currentParcel = value;
                    OnPropertyChanged(nameof(CurrentParcel));
                }
            }
        }

        private string _moduleName = "Parcels";
        public string ModuleName
        {
            get => _moduleName;
            set
            {
                if (_moduleName != value)
                {
                    _moduleName = value;
                    OnPropertyChanged(nameof(ModuleName));
                }
            }
        }

        private decimal _totalAmount;
        public decimal TotalAmount
        {
            get { return _totalAmount; }
            set
            {
                _totalAmount = value;
                OnPropertyChanged(nameof(TotalAmount));
            }
        }

        private Parcel _parcel;
        public Parcel Parcel
        {
            get => _parcel;
            set
            {
                _parcel = value;
                OnPropertyChanged(nameof(Parcel));
            }
        }

        public ObservableCollection<string> Destinations { get; } = new ObservableCollection<string>
    {
        "Eldoret", "Kapsabet", "Kakamega", "Kericho", "Kisumu", "Kitale", "Mombasa", "Nairobi", "Nakuru"
    };

        public ObservableCollection<string> PaymentMethods { get; } = new ObservableCollection<string>
    {
        "COD", "Paid", "Contract"
    };

        public ObservableCollection<Parcel> Parcels { get; set; } = new ObservableCollection<Parcel>();
        public ObservableCollection<Parcel> ParcelsInWaybill { get; set; } = new ObservableCollection<Parcel>();
        public ObservableCollection<string> WaybillNumbers { get; set; } = new ObservableCollection<string>();

        public ICommand ViewParcelsCommand { get; }
        public ICommand DoneCommand { get; }
        public ICommand AddParcelCommand { get; }
        public ICommand PrintReceiptCommand { get; }
        public ICommand ValidateParcelCommand { get; }
        public ICommand BackCommand { get; }
        public ICommand CartCommand { get; }
        public ICommand SearchParcelCommand { get; }
        public ICommand DeleteParcelCommand { get; }
        public ICommand EditParcelCommand { get; }
        public ICommand PrinterDiagnosticCommand { get; }

        public ParcelsViewModel(IParcelService parcelService, ISmsService smsService, IPrinterService printerService)
        {
            _parcelService = parcelService;
            _smsService = smsService;
            _printerService = printerService;

            CurrentParcel = new Parcel
            {
                CreatedAt = DateTime.UtcNow,
                Status = ParcelStatus.Pending
            };
            Parcels = new ObservableCollection<Parcel>();

            if (Preferences.ContainsKey("CurrentUserId"))
            {
                CurrentUserId = Preferences.Get("CurrentUserId", 0);
                if (CurrentUserId == 0) CurrentUserId = null;
            }

            ViewParcelsCommand = new Command(OnViewParcels);
            DoneCommand = new Command(async () =>
            {
                if (await ValidateParcelAsync())
                {
                    await OnDone();
                }
            });
            CartCommand = new Command(() => OnCartDone());
            AddParcelCommand = new Command(OnAddParcel);
            PrintReceiptCommand = new Command(OnPrintReceipt);
            ValidateParcelCommand = new Command(async () => await ValidateParcelAsync());
            BackCommand = new Command(async () => await BackToParcels());
            DeleteParcelCommand = new RelayCommand<Parcel>(OnDeleteParcel);
            EditParcelCommand = new RelayCommand<Parcel>(OnEditParcel);
            PrinterDiagnosticCommand = new Command(async () => await RunPrinterDiagnostics());
        }

        private async Task<bool> ValidateParcelAsync()
        {
            // 1. Validate required string fields
            if (string.IsNullOrWhiteSpace(CurrentParcel.Sender) ||
                string.IsNullOrWhiteSpace(CurrentParcel.Receiver) ||
                string.IsNullOrWhiteSpace(CurrentParcel.Destination) ||
                string.IsNullOrWhiteSpace(CurrentParcel.PaymentMethods) ||
                string.IsNullOrWhiteSpace(CurrentParcel.Description)) // Assuming Description is also required
            {
                await Application.Current.MainPage.DisplayAlert("Validation Error", "Please fill in Sender, Receiver, Destination, Payment Method, and Description.", "OK");
                return false;
            }

            // 2. Validate numeric fields: EITHER Amount OR (Rate AND Quantity) must be valid
            bool isAmountValid = CurrentParcel.Amount.HasValue && CurrentParcel.Amount.Value > 0;
            bool isRateValid = CurrentParcel.Rate.HasValue && CurrentParcel.Rate.Value > 0;
            bool isQuantityValid = CurrentParcel.Quantity.HasValue && CurrentParcel.Quantity.Value > 0;

            if (!isAmountValid && !(isRateValid && isQuantityValid))
            {
                // Neither Amount is valid, NOR is the combination of Rate and Quantity valid.
                await Application.Current.MainPage.DisplayAlert("Validation Error", "Please provide either a valid Amount OR both valid Rate and Quantity.", "OK");
                return false;
            }

            // 3. Validate phone numbers
            if (!IsValidPhoneNumber(CurrentParcel.SenderTelephone))
            {
                await Application.Current.MainPage.DisplayAlert("Validation Error", "Sender's phone number is invalid.", "OK");
                return false;
            }

            if (!IsValidPhoneNumber(CurrentParcel.ReceiverTelephone))
            {
                await Application.Current.MainPage.DisplayAlert("Validation Error", "Receiver's phone number is invalid.", "OK");
                return false;
            }

            // All checks passed
            return true;
        }

        private bool IsValidPhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return false;

            if (phoneNumber.StartsWith("+254") && phoneNumber.Length == 13)
            {
                return phoneNumber.Substring(4).All(char.IsDigit);
            }
            else if ((phoneNumber.StartsWith("07") || phoneNumber.StartsWith("01")) && phoneNumber.Length == 10)
            {
                return phoneNumber.Substring(2).All(char.IsDigit);
            }

            return false;
        }

        private async Task OnDone()
        {
            if (_parcelService == null)
            {
                await Application.Current.MainPage.DisplayAlert("Error", "Parcel service is not initialized.", "OK");
                return;
            }
 
            try
            {
                // Show loading with custom message
                _loadingService.Show("Saving parcel...");
                
                if (!await ValidateParcelAsync()) 
                {
                    return;
                }

                if (CurrentParcel.Rate != null && CurrentParcel.Rate > 0 && CurrentParcel.Quantity != null && CurrentParcel.Quantity > 0)
                {
                    CurrentParcel.TotalAmount = (CurrentParcel.Rate ?? 0) * (CurrentParcel.Quantity ?? 0);
                }
                else
                {
                    CurrentParcel.TotalAmount = CurrentParcel.Amount ?? 0;
                }

                if (CurrentParcel.DispatchedAt.HasValue && CurrentParcel.DispatchedAt.Value.Kind != DateTimeKind.Utc)
                {
                    CurrentParcel.DispatchedAt = CurrentParcel.DispatchedAt.Value.ToUniversalTime();
                }

                if (CurrentParcel.CreatedAt.Kind != DateTimeKind.Utc)
                {
                    CurrentParcel.CreatedAt = CurrentParcel.CreatedAt.ToUniversalTime();
                }

                CurrentParcel.CreatedById = CurrentUserId;

                // Update loading message for network operation
                _loadingService.Show("Connecting to server...");
                
                // Get the result from CreateParcelAsync which includes the waybill number from the server
                var updatedParcel = await _parcelService.CreateParcelAsync(CurrentParcel);
                
                // Update the current parcel with the waybill number
                if (updatedParcel != null && !string.IsNullOrEmpty(updatedParcel.WaybillNumber))
                {
                    CurrentParcel.WaybillNumber = updatedParcel.WaybillNumber;
                    CurrentParcel.QRCode = updatedParcel.QRCode;
                    Debug.WriteLine($"Updated current parcel with waybill number: {CurrentParcel.WaybillNumber}");
                }

                _loadingService.Show("Finalizing waybill...");
                await _parcelService.FinalizeWaybillAsync();

                if (_smsService != null && !string.IsNullOrEmpty(CurrentParcel.ReceiverTelephone))
                {
                    _loadingService.Show("Sending notification...");
                    try
                    {
                        // Check if SMS was already sent for this parcel
                        bool alreadySent = await _parcelService.CheckSmsNotificationSentAsync(CurrentParcel.Id);
                        
                        if (!alreadySent)
                        {
                            await _smsService.SendTemplatedParcelNotificationAsync(CurrentParcel);
                            Debug.WriteLine($"SMS notification sent for parcel {CurrentParcel.Id}");
                        }
                        else
                        {
                            Debug.WriteLine($"Skipping duplicate SMS for parcel {CurrentParcel.Id} - already sent");
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Failed to send SMS notification: {ex.Message}");
                    }
                }

                _loadingService.Show("Preparing receipt view...");
                
                // Ensure the current parcel is ready for receipt generation
                if (!string.IsNullOrEmpty(CurrentParcel.WaybillNumber))
                {
                    WaybillNumber = CurrentParcel.WaybillNumber;
                    Debug.WriteLine($"Set waybill number for receipt: {CurrentParcel.WaybillNumber}");
                }
                
                _loadingService.Hide();

                // Navigate to ReceiptView immediately without printing
                try
                {
                    Debug.WriteLine($"Navigating to ReceiptView with waybill: {WaybillNumber ?? CurrentParcel.WaybillNumber}");
                    await Shell.Current.GoToAsync($"{nameof(Views.ReceiptView)}", new Dictionary<string, object>
                    {
                        { "Parcel", CurrentParcel },
                        { "WaybillNumber", WaybillNumber ?? CurrentParcel.WaybillNumber },
                        { "ReceiptPrinted", false } // Receipt not printed yet - user can print from ReceiptView
                    });
                }
                catch (Exception navEx)
                {
                    Debug.WriteLine($"Navigation error: {navEx.Message}");
                    
                    // Fallback: Show success alert if navigation fails
                    await Application.Current.MainPage.DisplayAlert("Success", 
                        $"Parcel saved successfully with waybill {WaybillNumber ?? CurrentParcel.WaybillNumber}! " +
                        "Receipt can be printed from the diagnostics menu.", "OK");
                }
                
                // Reset after navigation
                ResetParcel();
            }
            catch (DbUpdateException dbEx)
            {
                var innerException = dbEx.InnerException != null ? dbEx.InnerException.Message : "No inner exception";
                _loadingService.Hide();
                await Application.Current.MainPage.DisplayAlert("Error", $"Failed to save parcel: {dbEx.Message}\nInner Exception: {innerException}", "OK");
            }
            catch (Exception ex)
            {
                _loadingService.Hide();
                await Application.Current.MainPage.DisplayAlert("Error", $"Failed to save parcel: {ex.Message}", "OK");
            }
            finally
            {
                // Ensure loading indicator is hidden even if there's an unhandled exception
                _loadingService.Hide();
            }
        }

        public async Task AddParcelToCart(Parcel newParcel)
        {
            if (string.IsNullOrEmpty(WaybillNumber))
            {
                WaybillNumber = await _parcelService.GenerateWaybillNumberAsync();
                newParcel.WaybillNumber = WaybillNumber;
            }

            Sender = newParcel.Sender;
            Receiver = newParcel.Receiver;

            newParcel.CreatedAt = DateTime.UtcNow;
            newParcel.Status = ParcelStatus.Pending;
            
            newParcel.CreatedById = CurrentUserId;

            if (newParcel.Quantity > 0 && newParcel.Rate > 0)
            {
                newParcel.Amount = newParcel.Quantity * newParcel.Rate;
            }
            else
            {
                newParcel.Amount = 0;
            }

            ParcelsInWaybill.Add(newParcel);

            OnPropertyChanged(nameof(ParcelsInWaybill));
            OnPropertyChanged(nameof(WaybillNumber));
            OnPropertyChanged(nameof(Sender));
            OnPropertyChanged(nameof(Receiver));
            OnPropertyChanged(nameof(TotalAmount));

            await Application.Current.MainPage.DisplayAlert("Success", "Parcel added to the current waybill.", "OK");
        }
        private async void OnEditParcel(Parcel parcel)
        {
            if (parcel != null)
            {
                CurrentParcel = parcel;

                await Application.Current.MainPage.Navigation.PopAsync();

                OnPropertyChanged(nameof(CurrentParcel));
            }
        }
        private void OnDeleteParcel(Parcel parcel)
        {
            if (parcel != null)
            {
                ParcelsInWaybill.Remove(parcel);
                UpdateCartTotalAmount();
                OnPropertyChanged(nameof(ParcelsInWaybill));
            }
        }
        private async Task OnCartDone()
        {
            try
            {
                _loadingService.Show("Checking connection...");
                
                if (!await _parcelService.CheckDatabaseConnectionAsync())
                {
                    var connectionString = "Check Debug Output for details";
                    Debug.WriteLine("CONNECTION ERROR: Cannot connect to the database using the configured connection string.");
                    
                    _loadingService.Hide();
                    await Application.Current.MainPage.DisplayAlert("Connection Error", 
                        $"Cannot connect to the database at 139.59.12.69. Please check your network connection and try again.\n\nDetails: {connectionString}", "OK");
                    return;
                }
                
                if (!_parcelService.IsNetworkAvailable())
                {
                    _loadingService.Hide();
                    await Application.Current.MainPage.DisplayAlert("Network Error", 
                        "No network connection available. Please check your internet connection and try again.", "OK");
                    return;
                }
                
                if (ParcelsInWaybill == null || !ParcelsInWaybill.Any())
                {
                    _loadingService.Hide();
                    await Application.Current.MainPage.DisplayAlert("Error", "No parcels in the cart to save.", "OK");
                    return;
                }

                _loadingService.Show("Generating waybill...");
                if (string.IsNullOrEmpty(WaybillNumber))
                {
                    WaybillNumber = await _parcelService.GenerateWaybillNumberAsync();
                }

                // Make sure all parcels have the same waybill number
                foreach (var parcel in ParcelsInWaybill)
                {
                    parcel.WaybillNumber = WaybillNumber;
                    parcel.DispatchedAt = parcel.DispatchedAt?.ToUniversalTime();
                }

                Debug.WriteLine($"Saving {ParcelsInWaybill.Count} parcels with waybill: {WaybillNumber}");

                try
                {
                    _loadingService.Show("Saving parcels to server...");
                    // Save the parcels and get the updated list with waybill numbers
                    var savedParcels = await _parcelService.CreateCartParcels(ParcelsInWaybill.ToList());
                    
                    // Update the parcels in the waybill with the returned data
                    if (savedParcels != null && savedParcels.Any())
                    {
                        // Replace our collection with the updated parcels that have waybill numbers
                        ParcelsInWaybill = new ObservableCollection<Parcel>(savedParcels);
                        
                        // Update the waybill number from the first parcel if not already set
                        if (string.IsNullOrEmpty(WaybillNumber) && !string.IsNullOrEmpty(savedParcels.First().WaybillNumber))
                        {
                            WaybillNumber = savedParcels.First().WaybillNumber;
                            Debug.WriteLine($"Updated waybill number from saved parcels: {WaybillNumber}");
                        }
                    }
                    
                    Debug.WriteLine("CreateCartParcels completed successfully");

                    _loadingService.Show("Finalizing waybill...");
                    await _parcelService.FinalizeWaybillAsync();
                    Debug.WriteLine("FinalizeWaybillAsync completed successfully");
                    
                    if (_smsService != null)
                    {
                        _loadingService.Show("Sending notifications...");
                        foreach (var parcel in ParcelsInWaybill)
                        {
                            if (!string.IsNullOrEmpty(parcel.ReceiverTelephone))
                            {
                                try
                                {
                                    // Check if SMS was already sent for this parcel
                                    bool alreadySent = await _parcelService.CheckSmsNotificationSentAsync(parcel.Id);
                                    
                                    if (!alreadySent)
                                    {
                                        await _smsService.SendTemplatedParcelNotificationAsync(parcel);
                                        Debug.WriteLine($"SMS notification sent for parcel {parcel.Id}");
                                    }
                                    else
                                    {
                                        Debug.WriteLine($"Skipping duplicate SMS for parcel {parcel.Id} - already sent");
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Debug.WriteLine($"Failed to send SMS notification for parcel {parcel.Id}: {ex.Message}");
                                }
                            }
                        }
                    }
                }
                catch (InvalidOperationException ioe)
                {
                    _loadingService.Hide();
                    // Display the specific message from the API
                    await Application.Current.MainPage.DisplayAlert("Waybill Error", ioe.Message, "OK"); 
                    // Clear the problematic ViewModel WaybillNumber so a new one is fetched on retry
                    this.WaybillNumber = string.Empty;
                    OnPropertyChanged(nameof(WaybillNumber)); // Notify UI if it displays this WaybillNumber
                    return; 
                }

                var totalAmount = ParcelsInWaybill.Sum(p => p.Amount ?? 0);
                var paymentMethod = PaymentMethods;
                var paymentMethodsList = new ObservableCollection<string>(PaymentMethods);
                
                // Ensure we're using the correct waybill number and calculating total amount
                Debug.WriteLine($"Creating receipt with waybill number: {WaybillNumber}, total amount: {totalAmount}");
                
                // First update the TotalAmount property on all parcels
                foreach (var parcel in ParcelsInWaybill)
                {
                    parcel.TotalAmount = totalAmount;
                }
                
                _loadingService.Show("Preparing receipt...");
                
                // Print receipt for multiple parcels using the device-agnostic printer service
                try
                {
                    var receiptPrinted = await PrintReceiptForMultipleParcelsList(ParcelsInWaybill.ToList(), WaybillNumber);
                    if (receiptPrinted)
                    {
                        await Application.Current.MainPage.DisplayAlert("Success", 
                            $"All parcels in waybill {WaybillNumber} have been saved and receipt printed successfully!", "OK");
                    }
                    else
                    {
                        await Application.Current.MainPage.DisplayAlert("Warning", 
                            $"All parcels in waybill {WaybillNumber} were saved but receipt printing failed. " +
                            "You can try printing from the diagnostics menu.", "OK");
                    }
                }
                catch (Exception printEx)
                {
                    Debug.WriteLine($"Error printing receipt: {printEx.Message}");
                    await Application.Current.MainPage.DisplayAlert("Warning", 
                        $"All parcels in waybill {WaybillNumber} were saved but receipt printing failed: {printEx.Message}", "OK");
                }

                _loadingService.Hide();

                ResetCart();
            }
            catch (Exception ex)
            {
                string errorMessage = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMessage += $"\nInner Exception: {ex.InnerException.Message}";
                }
                
                _loadingService.Hide();
                await Application.Current.MainPage.DisplayAlert("Error", $"Failed to process cart: {errorMessage}", "OK");
                
                Debug.WriteLine($"Error in OnCartDone: {ex}");
            }
            finally
            {
                // Ensure loading indicator is hidden in all cases
                _loadingService.Hide();
            }
        }

        private void OnPrintReceipt()
        {
            try
            {
                if (!ValidateParcelAsync().Result)
                {
                    return;
                }

                Application.Current.MainPage.DisplayAlert("Success", "Receipt printed successfully.", "OK");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Print error: {ex.Message}");
                Application.Current.MainPage.DisplayAlert("Error", "Failed to print receipt.", "OK");
            }
        }

        public void ResetParcel(bool keepSenderReceiverDetails = false)
        {
            string? existingSender = null;
            string? existingSenderTel = null;
            string? existingReceiver = null;
            string? existingReceiverTel = null;

            if (CurrentParcel != null && keepSenderReceiverDetails)
            {
                existingSender = CurrentParcel.Sender;
                existingSenderTel = CurrentParcel.SenderTelephone;
                existingReceiver = CurrentParcel.Receiver;
                existingReceiverTel = CurrentParcel.ReceiverTelephone;
            }
            
            CurrentParcel = new Parcel
            {
                CreatedAt = DateTime.UtcNow,
                Status = ParcelStatus.Pending,
                WaybillNumber = null, // Always reset WaybillNumber for a new CurrentParcel instance
                Sender = keepSenderReceiverDetails ? existingSender : null,
                SenderTelephone = keepSenderReceiverDetails ? existingSenderTel : null,
                Receiver = keepSenderReceiverDetails ? existingReceiver : null,
                ReceiverTelephone = keepSenderReceiverDetails ? existingReceiverTel : null
            };
            OnPropertyChanged(nameof(CurrentParcel)); // Notify that the whole CurrentParcel has changed
        }

        public void ResetCart()
        {
            ParcelsInWaybill.Clear();

            CurrentWaybill = null;

            WaybillNumber = string.Empty;
            Sender = string.Empty;
            Receiver = string.Empty;

            ResetParcel();

            OnPropertyChanged(nameof(ParcelsInWaybill));
            OnPropertyChanged(nameof(WaybillNumber));
            OnPropertyChanged(nameof(Sender));
            OnPropertyChanged(nameof(Receiver));
        }

        private async void OnViewParcels()
        {
            // Create a copy to pass to avoid potential issues with modifying the original collection during navigation
            var parcelsToView = new List<Parcel>(ParcelsInWaybill);

            // Pass the list as a navigation parameter using a RELATIVE route
            await Shell.Current.GoToAsync(nameof(ListParcelsView), new Dictionary<string, object>
            {
                { "ParcelsToDisplay", parcelsToView }
            });
        }

        private async Task BackToParcels()
        {
            IsReturningToView = true;

            ResetParcel(true);

            await Shell.Current.GoToAsync("..");
        }

        private async void OnAddParcel()
        {
            if (await ValidateParcelAsync())
            {
                await AddParcelToCart(CurrentParcel);

                ResetParcel(true);

                UpdateCartTotalAmount();

                await Application.Current.MainPage.DisplayAlert("Success", "Parcel added to the cart.", "OK");
            }
            else
            {
                await Application.Current.MainPage.DisplayAlert("Error", "Please fill in all required fields.", "OK");
            }
        }

        private void UpdateTotalAmount()
        {
            TotalAmount = Parcels.Sum(p => p.Amount ?? 0);
            OnPropertyChanged(nameof(TotalAmount));
        }

        public void UpdateCartTotalAmount()
        {
            TotalAmount = ParcelsInWaybill.Sum(parcel => parcel.Amount ?? 0);
            OnPropertyChanged(nameof(TotalAmount));
        }

        public void ResetAddParcel()
        {
            var sender = CurrentParcel.Sender;
            var senderTelephone = CurrentParcel.SenderTelephone;
            var receiver = CurrentParcel.Receiver;
            var receiverTelephone = CurrentParcel.ReceiverTelephone;
            var waybillNumber = CurrentParcel.WaybillNumber;

            CurrentParcel = new Parcel
            {
                Sender = sender,
                SenderTelephone = senderTelephone,
                Receiver = receiver,
                ReceiverTelephone = receiverTelephone,
                WaybillNumber = waybillNumber,
                CreatedAt = DateTime.UtcNow,
                Status = ParcelStatus.Pending
            };
            OnPropertyChanged(nameof(CurrentParcel));
        }

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        private async Task RunPrinterDiagnostics()
        {
            try
            {
                await Shell.Current.GoToAsync($"//{nameof(Views.PrinterDiagnosticView)}");
            }
            catch (Exception ex)
            {
                await Application.Current.MainPage.DisplayAlert("Error", $"Error navigating to printer diagnostics: {ex.Message}", "OK");
            }
        }

        public void PrintReceiptForSingleParcel(Parcel parcel)
        {
            try
            {
                if (parcel != null)
                {
                    Debug.WriteLine($"Print receipt requested for single parcel: {parcel.WaybillNumber ?? "N/A"}");
                    // Use async printing in a background task
                    Task.Run(async () =>
                    {
                        try
                        {
                            var printed = await PrintSingleParcelReceiptAsync(parcel);
                            var message = printed 
                                ? "Single parcel receipt printed successfully!" 
                                : "Failed to print single parcel receipt.";
                            
                            await Application.Current.MainPage.DisplayAlert("Print Receipt", message, "OK");
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Error printing single parcel receipt: {ex.Message}");
                            await Application.Current.MainPage.DisplayAlert("Print Error", 
                                $"Error printing receipt: {ex.Message}", "OK");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in PrintReceiptForSingleParcel: {ex.Message}");
            }
        }

        private void PrintReceiptForMultipleParcels(ObservableCollection<Parcel> parcels, string waybillNumber)
        {
            try
            {
                if (parcels != null && parcels.Count > 0)
                {
                    Debug.WriteLine($"Print receipt requested for multiple parcels in waybill: {waybillNumber ?? "N/A"}");
                    // Use async printing in a background task
                    Task.Run(async () =>
                    {
                        try
                        {
                            var printed = await PrintReceiptForMultipleParcelsList(parcels.ToList(), waybillNumber);
                            var message = printed 
                                ? $"Multiple parcels receipt for waybill {waybillNumber} printed successfully!" 
                                : $"Failed to print multiple parcels receipt for waybill {waybillNumber}.";
                            
                            await Application.Current.MainPage.DisplayAlert("Print Receipt", message, "OK");
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Error printing multiple parcels receipt: {ex.Message}");
                            await Application.Current.MainPage.DisplayAlert("Print Error", 
                                $"Error printing receipt: {ex.Message}", "OK");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in PrintReceiptForMultipleParcels: {ex.Message}");
            }
        }
        
        private async Task<bool> PrintSingleParcelReceiptAsync(Parcel parcel)
        {
            try
            {
                if (parcel == null || string.IsNullOrEmpty(parcel.WaybillNumber))
                {
                    Debug.WriteLine("Parcel is null or WaybillNumber is empty. Cannot print receipt.");
                    return false;
                }

                Debug.WriteLine($"Starting to print receipt for parcel: {parcel.WaybillNumber}");
                
                // Initialize printer
                var initialized = await _printerService.InitializePrinterAsync();
                if (!initialized)
                {
                    Debug.WriteLine("Failed to initialize printer");
                    return false;
                }
                
                // Build the receipt content
                var receiptContent = BuildSingleParcelReceiptContent(parcel);
                
                // Print the receipt
                var printResult = await _printerService.PrintTextAsync(receiptContent);
                
                if (printResult)
                {
                    Debug.WriteLine("Receipt printed successfully");
                    
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
                            Debug.WriteLine($"QR code printing failed: {qrEx.Message}");
                            // Continue without QR code
                        }
                    }
                    
                    // Start the print job
                    if (_printerService is VanstonePrinterService vanstonePrinter2)
                    {
                        await vanstonePrinter2.StartPrintJobAsync();
                    }
                    else if (_printerService is CS30PrinterService cs30Printer2)
                    {
                        await cs30Printer2.StartPrintJobAsync();
                    }
                    
                    return true;
                }
                else
                {
                    Debug.WriteLine("Failed to print receipt");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error printing receipt: {ex.Message}");
                return false;
            }
        }
        
        private string BuildSingleParcelReceiptContent(Parcel parcel)
        {
            // Get the logged-in username
            var username = Preferences.Get("CurrentUsername", "Staff");
            
            return $@"NID Logistics Ltd
           0116000004
  info@nidlogistics.co.ke
       WAYBILL RECEIPT

Waybill Number: {parcel.WaybillNumber ?? "N/A"}
Date: {DateTime.Now:yyyy-MM-dd HH:mm:ss}

Item: {parcel.Description ?? "N/A"}
From: {parcel.Sender ?? "N/A"}
To: {parcel.Receiver ?? "N/A"}
Dest: {parcel.Destination ?? "N/A"}
Rate: {parcel.Rate ?? 0}
Qty: {parcel.Quantity ?? 0}
Amount: Ksh {parcel.Amount ?? 0:N2}

Payment: {parcel.PaymentMethods ?? "N/A"}
Total: Ksh {parcel.TotalAmount:N2}
-------------------------------

Processed by: {username}

NB:
1. Contents not checked.
2. Customers advised to insure goods 
   if value exceeds Ksh 50,000.
3. Mirrors/boards carried at owner's risk.
4. Cash not accepted as courier, 
   company not liable.

PAYMENT INFO:
Paybill: 522533
Account: 1329713648
Mpesa Till: 4214115

";
        }

        private async Task<bool> PrintReceiptForMultipleParcelsList(List<Parcel> parcels, string waybillNumber)
        {
            try
            {
                if (parcels == null || !parcels.Any() || string.IsNullOrEmpty(waybillNumber))
                {
                    Debug.WriteLine("Parcels list is null/empty or WaybillNumber is empty. Cannot print receipt.");
                    return false;
                }

                Debug.WriteLine($"Starting to print receipt for waybill: {waybillNumber} with {parcels.Count} parcels");
                
                // Initialize printer
                var initialized = await _printerService.InitializePrinterAsync();
                if (!initialized)
                {
                    Debug.WriteLine("Failed to initialize printer");
                    return false;
                }

                // Get the logged-in username
                var username = Preferences.Get("CurrentUsername", "Staff");

                // Build the receipt content using the original format for multiple parcels
                var receiptContent = BuildMultipleParcelWaybillReceiptContent(parcels, waybillNumber, username);

                // Prepare the receipt content for printing
                var textPrintResult = await _printerService.PrintTextAsync(receiptContent);
                if (!textPrintResult)
                {
                    Debug.WriteLine("Failed to prepare batch receipt text for printing");
                    return false;
                }

                // Add QR code for the waybill
                if (!string.IsNullOrEmpty(waybillNumber))
                {
                    try
                    {
                        await _printerService.PrintQRCodeAsync(waybillNumber, 300, 300);
                        Debug.WriteLine("QR code prepared for printing");
                    }
                    catch (Exception qrEx)
                    {
                        Debug.WriteLine($"QR code preparation failed: {qrEx.Message}");
                        // Continue without QR code - print waybill as text fallback
                        await _printerService.PrintTextAsync($"\nWaybill: {waybillNumber}\n");
                    }
                }

                // Start the actual printing
                var printJobStarted = await _printerService.StartPrintJobAsync();
                if (printJobStarted)
                {
                    Debug.WriteLine("Batch receipt printed successfully");
                    return true;
                }
                else
                {
                    Debug.WriteLine("Failed to start print job");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error printing batch receipt: {ex.Message}");
                return false;
            }
        }

        private string BuildMultipleParcelWaybillReceiptContent(List<Parcel> parcels, string waybillNumber, string username)
        {
            var totalAmount = parcels.Sum(p => p.Amount ?? 0);
            var totalQuantity = parcels.Sum(p => p.Quantity ?? 0);
            var firstParcel = parcels.FirstOrDefault();
            
            var content = $@" NID Logistics Ltd
           0116000004
  info@nidlogistics.co.ke
       WAYBILL RECEIPT

Waybill Number: {waybillNumber}
Date: {DateTime.Now:yyyy-MM-dd HH:mm:ss}

Items: {parcels.Count} parcels";

            // Add details for each parcel
            for (int i = 0; i < parcels.Count; i++)
            {
                var parcel = parcels[i];
                content += $@"
From: {parcel.Sender ?? "N/A"}
To: {parcel.Receiver ?? "N/A"}
Dest: {parcel.Destination ?? "N/A"}
Qty: {parcel.Quantity ?? 0}
Amount: Ksh {parcel.Amount ?? 0:N2}";
                
                if (i < parcels.Count - 1)
                {
                    content += "\n";
                }
            }

            content += $@"

Payment: {firstParcel?.PaymentMethods ?? "N/A"}
Total: Ksh {totalAmount:N2}
-------------------------------

Processed by: {username}

NB:
1. Contents not checked.
2. Customers advised to insure goods 
   if value exceeds Ksh 50,000.
3. Mirrors/boards carried at owner's risk.
4. Cash not accepted as courier, 
   company not liable.

PAYMENT INFO:
Paybill: 522533
Account: 1329713648
Mpesa Till: 4214115

";
            return content;
        }

        private async Task<bool> PrintReceiptForCurrentParcel()
        {
            try
            {
                if (CurrentParcel == null || string.IsNullOrEmpty(CurrentParcel.WaybillNumber))
                {
                    Debug.WriteLine("CurrentParcel is null or WaybillNumber is empty. Cannot print receipt.");
                    return false;
                }

                Debug.WriteLine($"Starting to print receipt for current parcel: {CurrentParcel.WaybillNumber}");
                
                // Initialize printer
                var initialized = await _printerService.InitializePrinterAsync();
                if (!initialized)
                {
                    Debug.WriteLine("Failed to initialize printer");
                    return false;
                }

                // Get the logged-in username
                var username = Preferences.Get("CurrentUsername", "Staff");

                // Build the receipt content using the original format
                var receiptContent = BuildWaybillReceiptContent(CurrentParcel, username);

                // Prepare the receipt content for printing
                var textPrintResult = await _printerService.PrintTextAsync(receiptContent);
                if (!textPrintResult)
                {
                    Debug.WriteLine("Failed to prepare receipt text for printing");
                    return false;
                }

                // Add QR code if waybill number is available
                if (!string.IsNullOrEmpty(CurrentParcel.WaybillNumber))
                {
                    try
                    {
                        await _printerService.PrintQRCodeAsync(CurrentParcel.WaybillNumber, 300, 300);
                        Debug.WriteLine("QR code prepared for printing");
                    }
                    catch (Exception qrEx)
                    {
                        Debug.WriteLine($"QR code preparation failed: {qrEx.Message}");
                        // Continue without QR code - print waybill as text fallback
                        await _printerService.PrintTextAsync($"\nWaybill: {CurrentParcel.WaybillNumber}\n");
                    }
                }

                // Start the actual printing
                var printJobStarted = await _printerService.StartPrintJobAsync();
                if (printJobStarted)
                {
                    Debug.WriteLine("Receipt printed successfully");
                    return true;
                }
                else
                {
                    Debug.WriteLine("Failed to start print job");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error printing receipt: {ex.Message}");
                return false;
            }
        }

        private string BuildWaybillReceiptContent(Parcel parcel, string username)
        {
            return $@" NID Logistics Ltd
           0116000004
  info@nidlogistics.co.ke
       WAYBILL RECEIPT

Waybill Number: {parcel.WaybillNumber}
Date: {DateTime.Now:yyyy-MM-dd HH:mm:ss}

Item: {parcel.Description ?? "N/A"}
From: {parcel.Sender ?? "N/A"}
To: {parcel.Receiver ?? "N/A"}
Dest: {parcel.Destination ?? "N/A"}
Rate: {parcel.Rate ?? 0}
Qty: {parcel.Quantity ?? 0}
Amount: Ksh {parcel.Amount ?? 0:N2}

Payment: {parcel.PaymentMethods ?? "N/A"}
Total: Ksh {parcel.TotalAmount:N2}
-------------------------------

Processed by: {username}

NB:
1. Contents not checked.
2. Customers advised to insure goods 
   if value exceeds Ksh 50,000.
3. Mirrors/boards carried at owner's risk.
4. Cash not accepted as courier, 
   company not liable.

PAYMENT INFO:
Paybill: 522533
Account: 1329713648
Mpesa Till: 4214115

";
        }
    }
}
