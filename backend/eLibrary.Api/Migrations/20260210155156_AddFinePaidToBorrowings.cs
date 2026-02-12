using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eLibrary.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFinePaidToBorrowings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FinePaid",
                schema: "library",
                table: "Borrowings",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FinePaid",
                schema: "library",
                table: "Borrowings");
        }
    }
}
