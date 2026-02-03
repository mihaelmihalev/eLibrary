using eLibrary.Api.Auth;
using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using eLibrary.Api.Models.Subscriptions;

namespace eLibrary.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        await ctx.Database.MigrateAsync();

        string[] requiredRoles = [Roles.Admin, Roles.User];
        foreach (var roleName in requiredRoles)
            if (!await roleMgr.RoleExistsAsync(roleName))
                await roleMgr.CreateAsync(new IdentityRole(roleName));

        foreach (var role in roleMgr.Roles.ToList())
            if (!requiredRoles.Contains(role.Name))
                await roleMgr.DeleteAsync(role);

        var adminEmail = config["Admin:Email"] ?? "admin@elib.local";
        var adminPassword = config["Admin:Password"] ?? "Admin!123";
        var adminUserName = config["Admin:UserName"] ?? "SystemAdmin";

        var admin = await userMgr.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            admin = new User
            {
                Email = adminEmail,
                UserName = adminUserName,
                EmailConfirmed = true
            };
            var create = await userMgr.CreateAsync(admin, adminPassword);
            if (!create.Succeeded)
                throw new Exception(string.Join("; ", create.Errors.Select(e => e.Description)));
        }

        foreach (var r in requiredRoles)
            if (!await userMgr.IsInRoleAsync(admin, r))
                await userMgr.AddToRoleAsync(admin, r);

        foreach (var u in userMgr.Users.ToList())
            if (!await userMgr.IsInRoleAsync(u, Roles.User))
                await userMgr.AddToRoleAsync(u, Roles.User);

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.SubscriptionPlans.AnyAsync())
        {
            db.SubscriptionPlans.AddRange(
                new SubscriptionPlan { Name = "Daily", DurationDays = 1, Price = 1.00m },
                new SubscriptionPlan { Name = "Weekly", DurationDays = 7, Price = 3.00m },
                new SubscriptionPlan { Name = "Monthly", DurationDays = 30, Price = 8.00m },
                new SubscriptionPlan { Name = "Yearly", DurationDays = 365, Price = 60.00m }
            );
            await db.SaveChangesAsync();
        }
    }



}
