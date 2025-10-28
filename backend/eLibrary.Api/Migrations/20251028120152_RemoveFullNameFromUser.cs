using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eLibrary.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveFullNameFromUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FullName",
                schema: "auth",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FullName",
                schema: "auth",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
