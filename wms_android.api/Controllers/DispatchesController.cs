using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using wms_android.shared.Models;
using wms_android.shared.Data;
// using wms_android.shared.Data;

namespace wms_android.api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DispatchesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DispatchesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        public async Task<ActionResult<Dispatch>> CreateDispatch([FromBody] Dispatch dispatch)
        {
            try
            {
                // Debug logging
                Console.WriteLine($"[DispatchesController] Received dispatch: {System.Text.Json.JsonSerializer.Serialize(dispatch)}");
                Console.WriteLine($"[DispatchesController] SourceBranch: '{dispatch.SourceBranch}'");
                Console.WriteLine($"[DispatchesController] Destination: '{dispatch.Destination}'");
                Console.WriteLine($"[DispatchesController] ParcelIds count: {dispatch.ParcelIds?.Count ?? 0}");
                Console.WriteLine($"[DispatchesController] ParcelIds: {string.Join(", ", dispatch.ParcelIds ?? new List<Guid>())}");
                
                // Validate parcel IDs
                if (dispatch.ParcelIds == null || dispatch.ParcelIds.Count == 0)
                    return BadRequest("At least one parcel ID is required");

                // Check if parcels exist
                var existingParcels = await _context.Parcels
                    .Where(p => dispatch.ParcelIds.Contains(p.Id))
                    .ToListAsync();

                if (existingParcels.Count != dispatch.ParcelIds.Count)
                {
                    var missingIds = dispatch.ParcelIds.Except(existingParcels.Select(p => p.Id));
                    return BadRequest($"Some parcels not found: {string.Join(", ", missingIds)}");
                }

                // Generate a new UUID for the database ID (primary key)
                dispatch.Id = Guid.NewGuid();
                // Preserve the DispatchCode sent from client (e.g., "KRC-20250716-DSIF1Y6")
                // If no DispatchCode provided, use the generated UUID as fallback
                if (string.IsNullOrEmpty(dispatch.DispatchCode))
                {
                    dispatch.DispatchCode = dispatch.Id.ToString();
                }
                dispatch.DispatchTime = DateTime.UtcNow;
                dispatch.Status = "in_transit";

                // Update existing parcels to InTransit status
                foreach (var existingParcel in existingParcels)
                {
                    existingParcel.Status = ParcelStatus.InTransit;
                    existingParcel.DispatchedAt = dispatch.DispatchTime;
                    existingParcel.DispatchTrackingCode = dispatch.DispatchCode;
                    Console.WriteLine($"[DispatchesController] Updated parcel {existingParcel.WaybillNumber} to InTransit status");
                }

                // Associate parcels with the dispatch
                dispatch.Parcels = existingParcels;

                // Add dispatch to database
                _context.Dispatches.Add(dispatch);
                await _context.SaveChangesAsync();

                // Return a simplified response to avoid deserialization issues
                var response = new
                {
                    Id = dispatch.Id,
                    DispatchCode = dispatch.DispatchCode,
                    SourceBranch = dispatch.SourceBranch,
                    Destination = dispatch.EffectiveDestination, // Use EffectiveDestination for backward compatibility
                    VehicleNumber = dispatch.VehicleNumber,
                    Driver = dispatch.Driver,
                    DriverPhone = dispatch.DriverPhone,
                    ParcelIds = dispatch.ParcelIds,
                    DispatchTime = dispatch.DispatchTime,
                    Status = dispatch.Status,
                    ParcelCount = dispatch.ParcelIds?.Count ?? 0
                };

                Console.WriteLine($"[DispatchesController] Returning simplified response: {System.Text.Json.JsonSerializer.Serialize(response)}");
                return CreatedAtAction(nameof(GetDispatch), new { id = dispatch.Id }, response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating dispatch: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { error = "Failed to create dispatch", message = ex.Message, innerException = ex.InnerException?.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Dispatch>> GetDispatch(Guid id)
        {
            var dispatch = await _context.Dispatches.FindAsync(id);
            if (dispatch == null)
            {
                return NotFound();
            }
            return Ok(dispatch);
        }

        [HttpGet("branch/{branch}")]
        public async Task<ActionResult<IEnumerable<Dispatch>>> GetDispatchesByBranch(string branch)
        {
            Console.WriteLine($"[DispatchesController] GetDispatchesByBranch called with branch: '{branch}'");
            
            // Get all dispatches first to debug
            var allDispatches = await _context.Dispatches.ToListAsync();
            Console.WriteLine($"[DispatchesController] Total dispatches in DB: {allDispatches.Count}");
            
            foreach (var d in allDispatches.Take(5)) // Log first 5 for debugging
            {
                Console.WriteLine($"[DispatchesController] Dispatch ID: {d.Id}, SourceBranch: '{d.SourceBranch}', Destination: '{d.Destination}', DispatchCode: '{d.DispatchCode}'");
            }
            
            // Branch managers should see dispatches going TO their branch (Destination)
            // as well as dispatches coming FROM their branch (SourceBranch)
            var dispatches = await _context.Dispatches
                .Where(d => (!string.IsNullOrEmpty(d.SourceBranch) && d.SourceBranch.ToLower() == branch.ToLower()) ||
                           (!string.IsNullOrEmpty(d.Destination) && d.Destination.ToLower() == branch.ToLower()))
                .OrderByDescending(d => d.DispatchTime)
                .ToListAsync();

            Console.WriteLine($"[DispatchesController] Filtered dispatches for branch '{branch}': {dispatches.Count}");
            return Ok(dispatches);
        }

        [HttpGet("{id}/note")]
        public async Task<ActionResult<DispatchNote>> GetDispatchNote(Guid id)
        {
            // Load dispatch with parcel relationships
            var dispatch = await _context.Dispatches
                .Include(d => d.Parcels)  // Eager load parcels
                .FirstOrDefaultAsync(d => d.Id == id);

            if (dispatch == null)
            {
                return NotFound();
            }

            // Explicitly load parcels if not loaded
            if (dispatch.Parcels == null || dispatch.Parcels.Count == 0)
            {
                if (dispatch.ParcelIds != null && dispatch.ParcelIds.Count > 0)
                {
                    dispatch.Parcels = await _context.Parcels
                        .Where(p => dispatch.ParcelIds.Contains(p.Id))
                        .ToListAsync();
                }
                else
                {
                    dispatch.Parcels = new List<Parcel>();
                }
            }

            var note = new DispatchNote
            {
                DispatchId = dispatch.Id,
                DispatchCode = dispatch.DispatchCode, // Include the custom dispatch code
                SourceBranch = dispatch.SourceBranch,
                VehicleNumber = dispatch.VehicleNumber,
                Driver = dispatch.Driver,
                DriverPhone = dispatch.DriverPhone,
                DispatchTime = dispatch.DispatchTime,
                Parcels = dispatch.Parcels
            };

            return Ok(note);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Dispatch>>> GetAllDispatches()
        {
            try
            {
                var dispatches = await _context.Dispatches
                    .OrderByDescending(d => d.DispatchTime)
                    .ToListAsync();
                return Ok(dispatches);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve dispatches", message = ex.Message });
            }
        }
    }

    public class DispatchNote
    {
        public Guid DispatchId { get; set; }
        public string? DispatchCode { get; set; } // Add the custom dispatch code
        public string SourceBranch { get; set; }
        public string VehicleNumber { get; set; }
        public string Driver { get; set; }
        public string? DriverPhone { get; set; }
        public DateTime DispatchTime { get; set; }
        public List<Parcel> Parcels { get; set; }
    }

    // DTO for creating a dispatch
    public class CreateDispatchDto
    {
        public string? SourceBranch { get; set; }
        public string? VehicleNumber { get; set; }
        public string? Driver { get; set; }
        public string? DriverPhone { get; set; }
        public string? Destination { get; set; }
        public List<Guid>? Parcels { get; set; }
    }
} 