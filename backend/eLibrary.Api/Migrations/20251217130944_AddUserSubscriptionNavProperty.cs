using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace eLibrary.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSubscriptionNavProperty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "PaymentId",
                schema: "subscriptions",
                table: "UserSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_PlanId",
                schema: "subscriptions",
                table: "UserSubscriptions",
                column: "PlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserSubscriptions_SubscriptionPlans_PlanId",
                schema: "subscriptions",
                table: "UserSubscriptions",
                column: "PlanId",
                principalSchema: "subscriptions",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserSubscriptions_SubscriptionPlans_PlanId",
                schema: "subscriptions",
                table: "UserSubscriptions");

            migrationBuilder.DropIndex(
                name: "IX_UserSubscriptions_PlanId",
                schema: "subscriptions",
                table: "UserSubscriptions");

            migrationBuilder.AlterColumn<int>(
                name: "PaymentId",
                schema: "subscriptions",
                table: "UserSubscriptions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
