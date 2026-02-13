using eLibrary.Api.Common;
using eLibrary.Api.Data;
using eLibrary.Api.Models;
using eLibrary.Api.Models.Subscriptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
            if (role.Name != null && !requiredRoles.Contains(role.Name))
                await roleMgr.DeleteAsync(role);

        var existingAdmins = await userMgr.GetUsersInRoleAsync(Roles.Admin);

        if (!existingAdmins.Any())
        {
            var adminEmail = (config["Admin:Email"] ?? "admin@abv.bg").Trim();
            var adminPassword = config["Admin:Password"] ?? "Admin!123";
            var adminUserName = config["Admin:UserName"] ?? "admin";

            var admin = await userMgr.FindByEmailAsync(adminEmail);

            if (admin is null && !adminEmail.Equals("admin@abv.bg", StringComparison.OrdinalIgnoreCase))
            {
                var fallback = await userMgr.FindByEmailAsync("admin@abv.bg");
                if (fallback != null)
                {
                    admin = fallback;
                    adminEmail = "admin@abv.bg";
                }
            }

            if (admin is null)
            {
                admin = new User
                {
                    Email = adminEmail,
                    UserName = adminUserName,
                    PhoneNumber = "+359888123456"
                };

                var create = await userMgr.CreateAsync(admin, adminPassword);
                if (!create.Succeeded)
                    throw new Exception(string.Join("; ", create.Errors.Select(e => e.Description)));
            }

            if (!await userMgr.IsInRoleAsync(admin, Roles.Admin))
                await userMgr.AddToRoleAsync(admin, Roles.Admin);
        }

        if (!await ctx.SubscriptionPlans.AnyAsync())
        {
            ctx.SubscriptionPlans.AddRange(
                new SubscriptionPlan { Name = "Дневен", DurationDays = 1, Price = 1.00m },
                new SubscriptionPlan { Name = "Седмичен", DurationDays = 7, Price = 3.00m },
                new SubscriptionPlan { Name = "Месечен", DurationDays = 30, Price = 8.00m },
                new SubscriptionPlan { Name = "Годишен", DurationDays = 365, Price = 60.00m }
            );
            await ctx.SaveChangesAsync();
        }

        if (!await ctx.Books.AnyAsync())
        {
            ctx.Books.AddRange(
                new Book { Title = "Под игото", Author = "Иван Вазов", Genre = "Роман", Isbn = "9789545200000", CopiesTotal = 5, CopiesAvailable = 5, PublishedOn = new DateTime(1894, 1, 1), CoverUrl = "/uploads/covers/pod_igoto.jpg" },
                new Book { Title = "Бай Ганьо", Author = "Алеко Константинов", Genre = "Сатира", Isbn = "9789545200001", CopiesTotal = 4, CopiesAvailable = 4, PublishedOn = new DateTime(1895, 1, 1), CoverUrl = "/uploads/covers/bai_ganio.jpg" },
                new Book { Title = "Малкият принц", Author = "Антоан дьо Сент-Екзюпери", Genre = "Приказка", Isbn = "9780156013987", CopiesTotal = 7, CopiesAvailable = 7, PublishedOn = new DateTime(1943, 4, 6), CoverUrl = "/uploads/covers/malkiyat_princ.jpg" },
                new Book { Title = "Престъпление и наказание", Author = "Фьодор Достоевски", Genre = "Роман", Isbn = "9780140449136", CopiesTotal = 2, CopiesAvailable = 2, PublishedOn = new DateTime(1866, 1, 1), CoverUrl = "/uploads/covers/prestaplenie_i_nakazanie.jpg" },
                new Book { Title = "1984", Author = "Джордж Оруел", Genre = "Дистопия", Isbn = "9780451524935", CopiesTotal = 3, CopiesAvailable = 3, PublishedOn = new DateTime(1949, 6, 8), CoverUrl = "/uploads/covers/1984.jpg" },
                new Book { Title = "Фермата на животните", Author = "Джордж Оруел", Genre = "Сатира", Isbn = "9780451526342", CopiesTotal = 3, CopiesAvailable = 3, PublishedOn = new DateTime(1945, 8, 17), CoverUrl = "/uploads/covers/fermata_na_jivotnite.jpg" },
                new Book { Title = "Хари Потър и философският камък", Author = "Дж. К. Роулинг", Genre = "Фентъзи", Isbn = "9780747532699", CopiesTotal = 6, CopiesAvailable = 6, PublishedOn = new DateTime(1997, 6, 26), CoverUrl = "/uploads/covers/hari_potur.jpg" },
                new Book { Title = "Властелинът на пръстените", Author = "Дж. Р. Р. Толкин", Genre = "Фентъзи", Isbn = "9780618640157", CopiesTotal = 2, CopiesAvailable = 2, PublishedOn = new DateTime(1954, 7, 29), CoverUrl = "/uploads/covers/vlastelinut_na_prustenite.jpg" }
            );
            await ctx.SaveChangesAsync();
        }
    }
}
