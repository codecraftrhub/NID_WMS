using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace wms_android.api.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverPhoneToDispatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriverPhone",
                table: "Dispatches",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DriverPhone",
                table: "Dispatches");
        }
    }
}