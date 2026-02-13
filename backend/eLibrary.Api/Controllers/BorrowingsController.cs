using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eLibrary.Api.Common;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BorrowingsController : ControllerBase
{
    private const int MaxActiveBorrowings = 3;
    private const decimal FinePerOverdueDay = 0.50m;

    private const int ExtraFineAfterDays = 30;

    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;

    public BorrowingsController(AppDbContext db, UserManager<User> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var userId = _userManager.GetUserId(User)!;
        var now = DateTime.Now;

        await UpdateAccruedFines(userId, now);
        await EnsureBorrowingNotifications(userId, now);

        var items = await _db.Borrowings
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.ReturnedAt == null)
            .OrderByDescending(x => x.BorrowedAt)
            .Select(x => new
            {
                x.Id,
                x.BookId,
                x.BorrowedAt,
                x.DueAt,
                IsOverdue = x.DueAt < now,
                DaysLeft = x.DueAt >= now ? (int)Math.Ceiling((x.DueAt - now).TotalDays) : 0,
                OverdueDays = x.DueAt < now ? (int)Math.Ceiling((now - x.DueAt).TotalDays) : 0,
                BookTitle = x.Book.Title,
                Author = x.Book.Author
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var userId = _userManager.GetUserId(User)!;
        var now = DateTime.Now;

        await UpdateAccruedFines(userId, now);

        var items = await _db.Borrowings
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.BorrowedAt)
            .Select(x => new
            {
                x.Id,
                x.BookId,
                x.BorrowedAt,
                x.DueAt,
                x.ReturnedAt,
                x.FineAmount,
                x.FinePaid,
                WasOverdue = x.ReturnedAt != null && x.ReturnedAt > x.DueAt,
                BookTitle = x.Book.Title,
                Author = x.Book.Author
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{bookId:int}")]
    public async Task<IActionResult> Borrow(int bookId)
    {
        if (User.IsInRole("Admin"))
            return Forbid();

        var userId = _userManager.GetUserId(User)!;
        var now = DateTime.Now;

        await UpdateAccruedFines(userId, now);

        var hasUnpaidFines = await _db.Borrowings
            .AsNoTracking()
            .AnyAsync(b => b.UserId == userId && b.FineAmount > 0 && !b.FinePaid);

        if (hasUnpaidFines)
            return BadRequest("Имате неплатени неустойки за просрочие. Моля, платете ги от профила си, за да можете да заемате нови книги.");

        var subEnd = await GetActiveSubscriptionEndDate(userId, now);
        if (subEnd is null)
            return StatusCode(403, "Нямате активен абонамент. Моля, абонирайте се, за да заемате книги.");

        var overdue = await GetOverdueActiveBorrowing(userId, now);
        if (overdue.HasValue)
        {
            var (overdueDueAt, bookTitle) = overdue.Value;
            return BadRequest(
                $"Имате просрочена книга \"{bookTitle}\" (срок: {DateFmt.Bg(overdueDueAt)}). " +
                "Върнете я, за да можете да заемате нови книги."
            );
        }

        var start = now.Date;
        var end = start.AddDays(1);

        var borrowedToday = await _db.Borrowings
            .AsNoTracking()
            .AnyAsync(b =>
                b.UserId == userId &&
                b.BorrowedAt >= start &&
                b.BorrowedAt < end
            );

        var activeCount = await _db.Borrowings
            .CountAsync(b => b.UserId == userId && b.ReturnedAt == null);

        if (activeCount >= MaxActiveBorrowings)
            return BadRequest($"Достигнат е максималният брой активни заети книги ({MaxActiveBorrowings}).");

        var alreadyBorrowed = await _db.Borrowings
            .AnyAsync(b => b.UserId == userId && b.BookId == bookId && b.ReturnedAt == null);

        if (alreadyBorrowed)
            return BadRequest("Вече сте заели тази книга и тя не е върната.");

        var book = await _db.Books.FirstOrDefaultAsync(b => b.Id == bookId);
        if (book is null) return NotFound("Книгата не е намерена.");

        if (book.CopiesAvailable <= 0)
            return BadRequest("Няма налични бройки.");

        var dueByPolicy = now.AddDays(30);
        var subEndsAt = subEnd.Value;
        var dueAt = dueByPolicy <= subEndsAt ? dueByPolicy : subEndsAt;


        if (dueAt <= now)
            return StatusCode(403, "Абонаментът ви е изтекъл. Моля, подновете абонамента, за да заемате книги.");

        var rec = new Borrowing
        {
            BookId = bookId,
            UserId = userId,
            BorrowedAt = now,
            DueAt = dueAt,
            FineAmount = 0m,
            FinePaid = true
        };

        book.CopiesAvailable -= 1;

        _db.Borrowings.Add(rec);
        await _db.SaveChangesAsync();

        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = "Borrowed",
            Title = "Заета книга",
            Message = $"Заемане: \"{book.Title}\". Срок за връщане: {DateFmt.Bg(dueAt)}.",
            BorrowingId = rec.Id,
            CreatedAt = now
        });

        await _db.SaveChangesAsync();

        return Ok(new { rec.Id, rec.DueAt });
    }

    [HttpPost("{borrowingId:int}/return")]
    public async Task<IActionResult> Return(int borrowingId)
    {
        var userId = _userManager.GetUserId(User)!;
        var now = DateTime.Now;

        var rec = await _db.Borrowings
            .Include(x => x.Book)
            .FirstOrDefaultAsync(x => x.Id == borrowingId && x.UserId == userId);

        if (rec is null) return NotFound("Записът не е намерен.");
        if (rec.ReturnedAt != null) return BadRequest("Вече е върната.");

        var bookTitle = rec.Book?.Title ?? "(неизвестна книга)";

        rec.ReturnedAt = now;

        if (rec.Book != null)
        {
            rec.Book.CopiesAvailable = Math.Min(
                rec.Book.CopiesTotal,
                rec.Book.CopiesAvailable + 1
            );
        }

        var fine = ComputeFine(rec.DueAt, now);

        if (fine > 0m)
        {
            rec.FineAmount = fine;
            rec.FinePaid = false;

            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = "Fine",
                Title = "Начислена глоба",
                Message = $"Върнахте \"{bookTitle}\" със закъснение. Глоба: {rec.FineAmount:0.00} лв.",
                BorrowingId = rec.Id,
                CreatedAt = now
            });
        }
        else
        {
            rec.FineAmount = 0m;
            rec.FinePaid = true;

            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = "Returned",
                Title = "Върната книга",
                Message = $"Върнахте \"{bookTitle}\" навреме. Благодарим!",
                BorrowingId = rec.Id,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { rec.FineAmount, rec.FinePaid });
    }

    private Task<DateTime?> GetActiveSubscriptionEndDate(string userId, DateTime now)
    {
        return _db.UserSubscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .Select(s => (DateTime?)s.EndDate)
            .FirstOrDefaultAsync();
    }

    private async Task<(DateTime DueAt, string BookTitle)?> GetOverdueActiveBorrowing(string userId, DateTime now)
    {
        var rec = await _db.Borrowings
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.ReturnedAt == null && b.DueAt < now)
            .OrderBy(b => b.DueAt)
            .Select(b => new { b.DueAt, Title = b.Book.Title })
            .FirstOrDefaultAsync();

        return rec is null ? null : (rec.DueAt, rec.Title);
    }

    private async Task UpdateAccruedFines(string userId, DateTime now)
    {
        var overdue = await _db.Borrowings
            .Where(b => b.UserId == userId && b.ReturnedAt == null && b.DueAt < now)
            .ToListAsync();

        if (overdue.Count == 0) return;

        var changed = false;

        foreach (var b in overdue)
        {
            var fine = ComputeFine(b.DueAt, now);

            if (fine > b.FineAmount || (fine > 0m && b.FinePaid))
            {
                b.FineAmount = fine;
                b.FinePaid = fine == 0m;
                changed = true;
            }
        }

        if (changed)
            await _db.SaveChangesAsync();
    }

    private decimal ComputeFine(DateTime dueAt, DateTime now)
    {
        if (now <= dueAt) return 0m;

        var overdueDays = (int)Math.Ceiling((now - dueAt).TotalDays);
        if (overdueDays <= 0) return 0m;

        var fine = overdueDays * FinePerOverdueDay;

        if (overdueDays > ExtraFineAfterDays)
        {
            var extraDays = overdueDays - ExtraFineAfterDays;
            fine += extraDays * FinePerOverdueDay;
        }

        return Math.Round(fine, 2, MidpointRounding.AwayFromZero);
    }

    private async Task EnsureBorrowingNotifications(string userId, DateTime now)
    {
        var createdAny = false;

        var dueSoon = await _db.Borrowings
            .AsNoTracking()
            .Where(b =>
                b.UserId == userId &&
                b.ReturnedAt == null &&
                b.DueAt >= now &&
                b.DueAt <= now.AddDays(1))
            .Select(b => new { b.Id, b.DueAt, Title = b.Book.Title })
            .ToListAsync();

        if (dueSoon.Count > 0)
        {
            var ids = dueSoon.Select(x => x.Id).ToList();

            var already = await _db.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.UserId == userId &&
                    n.Type == "DueSoon" &&
                    n.BorrowingId != null &&
                    ids.Contains(n.BorrowingId.Value))
                .Select(n => n.BorrowingId!.Value)
                .ToListAsync();

            var set = new HashSet<int>(already);

            foreach (var d in dueSoon)
            {
                if (set.Contains(d.Id)) continue;

                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Type = "DueSoon",
                    Title = "Срокът наближава",
                    Message = $"\"{d.Title}\" трябва да бъде върната до {DateFmt.Bg(d.DueAt)}.",
                    BorrowingId = d.Id,
                    CreatedAt = now
                });

                createdAny = true;
            }
        }

        var overdue = await _db.Borrowings
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.ReturnedAt == null && b.DueAt < now)
            .Select(b => new { b.Id, b.DueAt, Title = b.Book.Title })
            .ToListAsync();

        if (overdue.Count > 0)
        {
            var ids = overdue.Select(x => x.Id).ToList();

            var already = await _db.Notifications
                .AsNoTracking()
                .Where(n =>
                    n.UserId == userId &&
                    n.Type == "Overdue" &&
                    n.BorrowingId != null &&
                    ids.Contains(n.BorrowingId.Value))
                .Select(n => n.BorrowingId!.Value)
                .ToListAsync();

            var set = new HashSet<int>(already);

            foreach (var o in overdue)
            {
                if (set.Contains(o.Id)) continue;

                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Type = "Overdue",
                    Title = "Просрочена книга",
                    Message = $"\"{o.Title}\" е просрочена. Срокът беше: {DateFmt.Bg(o.DueAt)}.",
                    BorrowingId = o.Id,
                    CreatedAt = now
                });

                createdAny = true;
            }
        }

        if (createdAny)
            await _db.SaveChangesAsync();
    }
}
