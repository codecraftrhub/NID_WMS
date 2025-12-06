using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Maui.Storage;
using System;
using System.Threading.Tasks;
using wms_android.Interfaces;
using wms_android.shared.Interfaces;
using wms_android.shared.Models;
using System.Diagnostics;

namespace wms_android.ViewModels
{
    public partial class ProfileViewModel : BaseViewModel
    {
        private readonly IUserService _userService;

        [ObservableProperty]
        private string _username = string.Empty;

        [ObservableProperty]
        private string _email = string.Empty;

        [ObservableProperty]
        private string _firstName = string.Empty;

        [ObservableProperty]
        private string _lastName = string.Empty;

        [ObservableProperty]
        private string _role = string.Empty;

        [ObservableProperty]
        private string _branchName = string.Empty;

        [ObservableProperty]
        private string _joinedDate = string.Empty;

        [ObservableProperty]
        private int _userId;

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private string _errorMessage = string.Empty;

        public ProfileViewModel(IUserService userService, ISessionTimeoutService sessionTimeout = null) : base(sessionTimeout)
        {
            _userService = userService;
            Title = "Profile";
            _ = LoadUserProfileAsync(); // Fire and forget
        }

        [RelayCommand]
        private async Task LoadUserProfileAsync()
        {
            if (IsLoading) return;

            IsLoading = true;
            ErrorMessage = string.Empty;

            try
            {
                // Get the current user ID from stored preferences
                var currentUserId = Preferences.Get("CurrentUserId", 0);
                
                if (currentUserId == 0)
                {
                    ErrorMessage = "User not found. Please log in again.";
                    Debug.WriteLine("ProfileViewModel: No current user ID found in preferences");
                    return;
                }

                Debug.WriteLine($"ProfileViewModel: Loading profile for user ID: {currentUserId}");

                // Fetch user details from API
                var user = await _userService.GetUserByIdAsync(currentUserId);

                if (user != null)
                {
                    UserId = user.Id;
                    Username = user.Username ?? "Unknown";
                    FirstName = user.FirstName ?? string.Empty;
                    LastName = user.LastName ?? string.Empty;
                    Role = user.Role?.Name ?? "User";
                    BranchName = user.Branch?.Name ?? "Not assigned";
                    JoinedDate = user.CreatedAt.ToString("MMMM yyyy");

                    // Set email - check if user has email, otherwise generate from username
                    Email = !string.IsNullOrEmpty(user.Email) 
                        ? user.Email 
                        : $"{Username.ToLower()}@nidlogistics.co.ke";

                    Debug.WriteLine($"ProfileViewModel: Successfully loaded profile for {Username}");
                }
                else
                {
                    ErrorMessage = "Failed to load user profile. Please try again.";
                    Debug.WriteLine("ProfileViewModel: User service returned null user");
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = "Failed to load profile information.";
                Debug.WriteLine($"ProfileViewModel: Error loading profile: {ex.Message}");
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        private async Task RefreshProfileAsync()
        {
            await LoadUserProfileAsync();
        }
    }
}