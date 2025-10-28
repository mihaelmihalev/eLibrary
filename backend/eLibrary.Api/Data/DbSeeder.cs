using eLibrary.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await ctx.Database.MigrateAsync();

        foreach (var role in new[] { "Admin", "Librarian", "Member" })
            if (!await roleMgr.RoleExistsAsync(role))
                await roleMgr.CreateAsync(new IdentityRole(role));

        var adminEmail = "admin@elib.local";
        var admin = await userMgr.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            admin = new User { UserName = "SystemAdmin", Email = adminEmail };
            await userMgr.CreateAsync(admin, "Admin!123");
            await userMgr.AddToRolesAsync(admin, new[] { "Admin", "Librarian" });
        }
    }
}
