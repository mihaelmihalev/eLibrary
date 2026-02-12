using eLibrary.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/stats")]
[AllowAnonymous]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var now = DateTime.Now;

        var usersCount = await _db.Users.AsNoTracking().CountAsync();

        var activeSubs = await _db.UserSubscriptions.AsNoTracking()
            .Where(s => s.IsActive && s.EndDate > now)
            .CountAsync();

        var totalBorrowings = await _db.Borrowings.AsNoTracking().CountAsync();
        var totalBooks = await _db.Books.AsNoTracking().CountAsync();

        return Ok(new
        {
            usersCount,
            activeSubs,
            totalBorrowings,
            totalBooks
        });
    }

    [HttpGet("top-borrowed")]
    public async Task<IActionResult> TopBorrowed([FromQuery] int limit = 5)
    {
        if (limit <= 0 || limit > 50) limit = 5;

        var list = await (
            from b in _db.Books.AsNoTracking()
            join br in _db.Borrowings.AsNoTracking() on b.Id equals br.BookId
            group b by new { b.Id, b.Title, b.Author } into g
            select new
            {
                bookId = g.Key.Id,
                title = g.Key.Title,
                author = g.Key.Author,
                borrowings = g.Count()
            }
        )
        .OrderByDescending(x => x.borrowings)
        .ThenBy(x => x.title)
        .Take(limit)
        .ToListAsync();

        return Ok(list);
    }

    [HttpGet("top-reviewed")]
    public async Task<IActionResult> TopReviewed([FromQuery] int limit = 5)
    {
        if (limit <= 0 || limit > 50) limit = 5;

        var list = await (
            from b in _db.Books.AsNoTracking()
            join r in _db.Reviews.AsNoTracking() on b.Id equals r.BookId
            group b by new { b.Id, b.Title, b.Author } into g
            select new
            {
                bookId = g.Key.Id,
                title = g.Key.Title,
                author = g.Key.Author,
                reviews = g.Count()
            }
        )
        .OrderByDescending(x => x.reviews)
        .ThenBy(x => x.title)  
        .Take(limit)
        .ToListAsync();

        return Ok(list);
    }

    [HttpGet("top-rated")]
    public async Task<IActionResult> TopRated([FromQuery] int limit = 5)
    {
        if (limit <= 0 || limit > 50) limit = 5;

        var raw = await (
            from b in _db.Books.AsNoTracking()
            join r in _db.Reviews.AsNoTracking() on b.Id equals r.BookId
            group r by new { b.Id, b.Title, b.Author } into g
            select new
            {
                bookId = g.Key.Id,
                title = g.Key.Title,
                author = g.Key.Author,
                avgRating = g.Average(x => x.Rating),
                reviewsCount = g.Count()
            }
        )
        .OrderByDescending(x => x.avgRating)
        .ThenBy(x => x.title) 
        .Take(limit)
        .ToListAsync();

        var result = raw.Select(x => new
        {
            x.bookId,
            x.title,
            x.author,
            avgRating = Math.Round(x.avgRating, 2),
            x.reviewsCount
        });

        return Ok(result);
    }
}
