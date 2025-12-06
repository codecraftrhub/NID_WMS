using wms_android.shared.Data;
using wms_android.shared.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using wms_android.shared.Models.Auth;
using wms_android.shared.Services;
using Microsoft.Extensions.Options;
using wms_android.api.Services;
using wms_android.api.Interfaces;
using System.Linq;
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Configuration is automatically loaded from appsettings.json and appsettings.{Environment}.json
        Console.WriteLine($"=== Application Starting ===");
        Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");
        Console.WriteLine($"Working Directory: {Directory.GetCurrentDirectory()}");
        Console.WriteLine($"Content Root: {builder.Environment.ContentRootPath}");

        // Add services to container
        builder.Services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve;
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        });
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // Register services
        builder.Services.AddScoped<IParcelService, ApiParcelService>();

        // Configure database using connection string from appsettings or environment variables
        // Always prefer environment variables in production for security
        var dbHost = builder.Configuration["DB_HOST"] ?? Environment.GetEnvironmentVariable("DB_HOST");
        var dbPort = builder.Configuration["DB_PORT"] ?? Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
        var dbName = builder.Configuration["DB_NAME"] ?? Environment.GetEnvironmentVariable("DB_NAME");
        var dbUser = builder.Configuration["DB_USER"] ?? Environment.GetEnvironmentVariable("DB_USER");
        var dbPassword = builder.Configuration["DB_PASSWORD"] ?? Environment.GetEnvironmentVariable("DB_PASSWORD");
        
        string connectionString;
        
        // If we have individual DB environment variables, use them (preferred in production)
        if (!string.IsNullOrEmpty(dbHost) && !string.IsNullOrEmpty(dbName) && 
            !string.IsNullOrEmpty(dbUser) && !string.IsNullOrEmpty(dbPassword))
        {
            // Use correct Npgsql connection string parameter names
            // Npgsql uses camelCase parameter names: MinPoolSize, MaxPoolSize (no spaces)
            connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};SSL Mode=Require;Trust Server Certificate=true;Pooling=true;MinPoolSize=5;MaxPoolSize=100;Command Timeout=30;Timeout=30;Keepalive=60";
            Console.WriteLine($"✓ Built connection string from environment variables");
            Console.WriteLine($"  Host: {dbHost}, Port: {dbPort}, Database: {dbName}, User: {dbUser}");
        }
        else
        {
            // Fall back to configuration file, but check for placeholders
            var configConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            if (!string.IsNullOrEmpty(configConnectionString) && !configConnectionString.Contains("${"))
            {
                connectionString = configConnectionString;
                Console.WriteLine($"✓ Using connection string from configuration file");
            }
            else
            {
                throw new InvalidOperationException("Database connection string is not configured. Either set ConnectionStrings__DefaultConnection or provide DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD environment variables.");
            }
        }

        // Configure Npgsql to use timestamps with time zone by default
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly("wms_android.api");
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
            }));

        // Add Health Checks with the explicit connection string
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<AppDbContext>();

        // Configure JWT
        var jwtConfig = builder.Configuration.GetSection("JwtConfig").Get<JwtConfig>();
        builder.Services.AddSingleton(Options.Create(jwtConfig));

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig.Secret)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtConfig.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtConfig.Audience,
                    ClockSkew = TimeSpan.Zero
                };
            });

        // Configure CORS
        var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "*" };
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowWebApp",
                policy =>
                {
                    policy.WithOrigins(corsOrigins)
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
        });

        // Register services
        builder.Services.AddHttpClient();
        builder.Services.AddScoped<IUserService, wms_android.shared.Services.UserService>();
        builder.Services.AddScoped<IVehicleService, VehicleService>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<ISmsService, wms_android.shared.Services.SmsService>();
        builder.Services.AddScoped<wms_android.api.Interfaces.ITokenService, wms_android.api.Services.TokenService>();

        var app = builder.Build();

        // Apply database migrations on startup
        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

            try
            {
                logger.LogInformation("Attempting to connect to database and apply migrations...");
                
                // Check if database exists and can be connected to
                var canConnect = dbContext.Database.CanConnect();
                logger.LogInformation($"Database can connect: {canConnect}");
                
                // Get pending migrations
                var pendingMigrations = dbContext.Database.GetPendingMigrations().ToList();
                logger.LogInformation($"Pending migrations: {pendingMigrations.Count}");
                if (pendingMigrations.Any())
                {
                    logger.LogInformation($"Migrations to apply: {string.Join(", ", pendingMigrations)}");
                }
                
                // Apply migrations
                dbContext.Database.Migrate();
                logger.LogInformation("Database migration completed successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while migrating the database. Error: {Message}", ex.Message);
                logger.LogError("Stack trace: {StackTrace}", ex.StackTrace);
                // In production, we should still throw to prevent app from starting with incomplete database
                // This ensures we catch migration issues early
                logger.LogCritical("CRITICAL: Database migration failed. Application cannot continue without proper database schema.");
                throw; // Re-throw to prevent app from starting with broken database
            }
        }

        // Configure path base for DigitalOcean routing
        // DigitalOcean routes /api/* to this service, so we need to handle the /api prefix
        var pathBase = builder.Configuration["PathBase"] ?? "/api";
        if (!string.IsNullOrEmpty(pathBase) && pathBase != "/")
        {
            app.UsePathBase(pathBase);
            Console.WriteLine($"Using path base: {pathBase}");
        }

        // Configure the HTTP request pipeline
        // Enable Swagger in all environments for API documentation
        app.UseSwagger(c =>
        {
            c.RouteTemplate = "swagger/{documentName}/swagger.json";
        });
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "WMS Android API v1");
            c.RoutePrefix = "swagger";
            // Enable deep linking and persist authorization
            c.EnableDeepLinking();
            c.EnablePersistAuthorization();
        });

        // Middleware pipeline
        app.UseHttpsRedirection();
        app.UseCors("AllowWebApp");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        
        // Map health checks endpoint last
        app.MapHealthChecks("/health");

        // Add a diagnostic endpoint to help troubleshoot route issues
        app.MapFallback(async context => {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { 
                error = "Route not found",
                path = context.Request.Path.Value,
                method = context.Request.Method,
                availableRoutes = "Use /swagger to view available API endpoints"
            });
        });

        app.Run();
    }
}
// var builder = WebApplication.CreateBuilder(args);

// // Force Production environment and its configuration
// builder.Configuration.SetBasePath(Directory.GetCurrentDirectory())
//     .AddJsonFile("appsettings.Production.json", optional: false, reloadOnChange: true)
//     .AddEnvironmentVariables();

// // Log the current configuration
// Console.WriteLine($"Current environment: {builder.Environment.EnvironmentName}");
// Console.WriteLine($"Using connection string: {builder.Configuration.GetConnectionString("DefaultConnection")}");

// // Add CORS policy
// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowMobileApp",
//         builder => builder
//             .AllowAnyOrigin()
//             .AllowAnyMethod()
//             .AllowAnyHeader());
// });

// // Configure database
// builder.Services.AddDbContext<AppDbContext>(options =>
// {
//     var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
//     Console.WriteLine($"Attempting to connect with: {connectionString}");
    
//     options.UseNpgsql(connectionString, npgsqlOptions =>
//     {
//         npgsqlOptions.EnableRetryOnFailure(
//             maxRetryCount: 3,
//             maxRetryDelay: TimeSpan.FromSeconds(10),
//             errorCodesToAdd: new[] { "57P01", "57P02", "57P03" });
//         npgsqlOptions.CommandTimeout(30);
//         npgsqlOptions.MigrationsAssembly("wms_android.api");
//     });
    
//     options.EnableDetailedErrors();
//     options.EnableSensitiveDataLogging();
// });

// // Add services
// builder.Services.AddScoped<IParcelService, ParcelService>();
// builder.Services.AddScoped<IUserService, UserService>();
// builder.Services.AddScoped<IVehicleService, VehicleService>();

// builder.Services.AddControllers();
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();

// var app = builder.Build();

// app.UseCors("AllowMobileApp");

// // Configure the HTTP request pipeline
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI();
// }

// app.UseHttpsRedirection();
// app.UseAuthorization();
// app.MapControllers();

// app.Run();

