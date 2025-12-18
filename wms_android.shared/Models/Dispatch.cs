using System;
using System.Collections.Generic;

namespace wms_android.shared.Models
{
    public class Dispatch
    {
        public Guid Id { get; set; }
        public string? DispatchCode { get; set; }
        public string SourceBranch { get; set; } = string.Empty;
        public string? Destination { get; set; } // Make destination nullable for backward compatibility
        public string VehicleNumber { get; set; } = string.Empty;
        public string Driver { get; set; } = string.Empty;
        public string? DriverPhone { get; set; } = string.Empty;
        public List<Guid> ParcelIds { get; set; } = new();
        public DateTime DispatchTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<Parcel> Parcels { get; set; } = new();
        
        // Computed property to provide fallback destination
        public string EffectiveDestination => Destination ?? SourceBranch ?? "Unknown";
    }
} 