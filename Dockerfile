# Use smaller base images to reduce memory footprint
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Use multi-stage build with optimized SDK image
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy only project files first for better layer caching
COPY ["wms_android.api/wms_android.api.csproj", "wms_android.api/"]
COPY ["wms_android.shared/wms_android.shared.csproj", "wms_android.shared/"]

# Set working directory and restore with optimizations
WORKDIR /src/wms_android.api

# Optimize restore process - reduce memory usage
RUN dotnet nuget locals all --clear && \
    dotnet restore "wms_android.api.csproj" \
    --verbosity minimal \
    --no-cache \
    --disable-parallel

# Copy source code (only what we need)
WORKDIR /src
COPY ["wms_android.api/", "wms_android.api/"]
COPY ["wms_android.shared/", "wms_android.shared/"]

# Build and publish in one step to avoid file missing issues
WORKDIR /src/wms_android.api
RUN dotnet publish "wms_android.api.csproj" \
    -c Release \
    -o /app/publish \
    --verbosity minimal \
    --no-cache \
    /p:UseAppHost=false \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false \
    /p:UseSharedCompilation=false \
    /p:BuildInParallel=false \
    /maxcpucount:1

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "wms_android.api.dll"]