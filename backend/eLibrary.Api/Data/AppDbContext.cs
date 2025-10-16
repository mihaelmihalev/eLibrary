using Microsoft.EntityFrameworkCore;
using eLibrary.Api.Models;

namespace eLibrary.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<Book> Books => Set<Book>();
    }
}
