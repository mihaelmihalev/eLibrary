using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using eLibrary.Api.Models;
using eLibrary.Api.Models.Subscriptions;

namespace eLibrary.Api.Data
{
    public class AppDbContext : IdentityDbContext<User, IdentityRole, string>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Book> Books => Set<Book>();
        public DbSet<Borrowing> Borrowings => Set<Borrowing>();
        public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
        public DbSet<SubscriptionRequest> SubscriptionRequests => Set<SubscriptionRequest>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<Notification> Notifications => Set<Notification>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.HasDefaultSchema("auth");

            builder.Entity<User>().ToTable("Users");
            builder.Entity<IdentityRole>().ToTable("Roles");
            builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
            builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
            builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
            builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

            builder.Entity<Book>().ToTable("Books", schema: "library");

            builder.Entity<Borrowing>()
                .ToTable("Borrowings", schema: "library")
                .HasOne(x => x.Book)
                .WithMany()
                .HasForeignKey(x => x.BookId);

            builder.Entity<Borrowing>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId);

            builder.Entity<SubscriptionPlan>()
                .ToTable("SubscriptionPlans", schema: "subscriptions");

            builder.Entity<SubscriptionRequest>()
                .ToTable("SubscriptionRequests", schema: "subscriptions");

            builder.Entity<Payment>()
                .ToTable("Payments", schema: "subscriptions");

            builder.Entity<UserSubscription>()
                .ToTable("UserSubscriptions", schema: "subscriptions");

            builder.Entity<SubscriptionRequest>()
                .HasOne(r => r.Plan)
                .WithMany()
                .HasForeignKey(r => r.PlanId);

            builder.Entity<Review>()
                .ToTable("Reviews", schema: "library")
                .HasOne(r => r.Book)
                .WithMany()
                .HasForeignKey(r => r.BookId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Review>()
                .HasIndex(r => new { r.BookId, r.UserId })
                .IsUnique();

            builder.Entity<Notification>()
                .HasIndex(n => new { n.UserId, n.ReadAt, n.CreatedAt });
        }
    }
}
