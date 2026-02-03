using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eLibrary.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBookCoverUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverUrl",
                schema: "library",
                table: "Books",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverUrl",
                schema: "library",
                table: "Books");
        }
    }
}
