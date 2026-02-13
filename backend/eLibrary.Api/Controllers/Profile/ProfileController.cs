using System.Security.Claims;
using eLibrary.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfileController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ProfileSummaryDto>> Summary(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new ProfileUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.UserName,
                Phone = u.PhoneNumber
            })
            .FirstOrDefaultAsync(ct);

        if (user == null)
            return Unauthorized();

        var borrowingsCount = await _db.Borrowings.AsNoTracking()
            .CountAsync(b => b.UserId == userId, ct);

        var activeBorrowingsCount = await _db.Borrowings.AsNoTracking()
            .CountAsync(b => b.UserId == userId && b.ReturnedAt == null, ct);

        var reviewsCount = await _db.Reviews.AsNoTracking()
            .CountAsync(r => r.UserId == userId, ct);

        var lastBorrowing = await _db.Borrowings.AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BorrowedAt)
            .Select(b => new LastBorrowingDto
            {
                BookId = b.BookId,
                Title = b.Book.Title,
                Author = b.Book.Author,
                BorrowedAt = b.BorrowedAt,
                ReturnedAt = b.ReturnedAt
            })
            .FirstOrDefaultAsync(ct);

        var lastReview = await _db.Reviews.AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new LastReviewDto
            {
                BookId = r.BookId,
                Title = r.Book.Title,
                Author = r.Book.Author,
                Rating = r.Rating,
                CreatedAt = r.CreatedAt
            })
            .FirstOrDefaultAsync(ct);

        var now = DateTime.Now;

        var sub = await (
            from us in _db.UserSubscriptions.AsNoTracking()
            join plan in _db.SubscriptionPlans.AsNoTracking()
                on us.PlanId equals plan.Id
            where us.UserId == userId
                  && us.StartDate <= now
                  && us.EndDate >= now
            orderby us.EndDate descending
            select new ProfileSubscriptionDto
            {
                PlanName = plan.Name,
                StartDate = us.StartDate,
                EndDate = us.EndDate
            }
        ).FirstOrDefaultAsync(ct);

        var score = borrowingsCount + reviewsCount;

        return Ok(new ProfileSummaryDto
        {
            User = user,
            Subscription = sub,
            Activity = new ProfileActivityDto
            {
                BorrowingsCount = borrowingsCount,
                ActiveBorrowingsCount = activeBorrowingsCount,
                ReviewsCount = reviewsCount,
                Score = score,
                LastBorrowing = lastBorrowing,
                LastReview = lastReview
            }
        });
    }

    [HttpGet("overview")]
    public async Task<ActionResult<ProfileOverviewDto>> Overview(
        [FromQuery] int historyLimit = 50,
        CancellationToken ct = default
    )
    {
        if (historyLimit <= 0 || historyLimit > 200) historyLimit = 50;

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var returnedHistory = await _db.Borrowings
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.ReturnedAt != null)
            .OrderByDescending(b => b.ReturnedAt)
            .Take(historyLimit)
            .Select(b => new ReturnedBorrowingDto
            {
                BorrowingId = b.Id,
                BookId = b.BookId,
                Title = b.Book.Title,
                Author = b.Book.Author,
                BorrowedAt = b.BorrowedAt,
                ReturnedAt = b.ReturnedAt!.Value,
                FineAmount = b.FineAmount
            })
            .ToListAsync(ct);

        return Ok(new ProfileOverviewDto
        {
            LastReturned = returnedHistory.FirstOrDefault(),
            ReturnedHistory = returnedHistory
        });
    }
}

public sealed class ProfileSummaryDto
{
    public ProfileUserDto User { get; set; } = new();
    public ProfileSubscriptionDto? Subscription { get; set; }
    public ProfileActivityDto Activity { get; set; } = new();
}

public sealed class ProfileUserDto
{
    public string Id { get; set; } = "";
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Phone { get; set; }
}

public sealed class ProfileSubscriptionDto
{
    public string PlanName { get; set; } = "";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public sealed class ProfileActivityDto
{
    public int BorrowingsCount { get; set; }
    public int ActiveBorrowingsCount { get; set; }
    public int ReviewsCount { get; set; }
    public int Score { get; set; }
    public LastBorrowingDto? LastBorrowing { get; set; }
    public LastReviewDto? LastReview { get; set; }
}

public sealed class LastBorrowingDto
{
    public int BookId { get; set; }
    public string Title { get; set; } = "";
    public string? Author { get; set; }
    public DateTime BorrowedAt { get; set; }
    public DateTime? ReturnedAt { get; set; }
}

public sealed class LastReviewDto
{
    public int BookId { get; set; }
    public string Title { get; set; } = "";
    public string? Author { get; set; }
    public int Rating { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class ProfileOverviewDto
{
    public ReturnedBorrowingDto? LastReturned { get; set; }
    public List<ReturnedBorrowingDto> ReturnedHistory { get; set; } = new();
}

public sealed class ReturnedBorrowingDto
{
    public int BorrowingId { get; set; }
    public int BookId { get; set; }
    public string Title { get; set; } = "";
    public string? Author { get; set; }
    public DateTime BorrowedAt { get; set; }
    public DateTime ReturnedAt { get; set; }
    public decimal FineAmount { get; set; }
}
