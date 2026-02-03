using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BorrowingsController : ControllerBase
{
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

        var items = await _db.Borrowings
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.ReturnedAt == null)
            .OrderByDescending(x => x.BorrowedAt)
            .Select(x => new
            {
                x.Id,
                x.BookId,
                x.BorrowedAt,
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

        var items = await _db.Borrowings
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.BorrowedAt)
            .Select(x => new
            {
                x.Id,
                x.BookId,
                x.BorrowedAt,
                x.ReturnedAt,
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
        var now = DateTime.UtcNow;

        var hasActiveSubscription = await _db.UserSubscriptions
            .AnyAsync(s => s.UserId == userId && s.IsActive && s.EndDate > now);

        if (!hasActiveSubscription)
        {
            return BadRequest("Нямате активен абонамент. Моля, абонирайте се, за да заемате книги.");
        }

        var activeCount = await _db.Borrowings
            .CountAsync(b => b.UserId == userId && b.ReturnedAt == null);

        if (activeCount >= 5)
        {
            return BadRequest("Достигнат е максималният брой активни заети книги (5).");
        }

        var alreadyBorrowed = await _db.Borrowings
            .AnyAsync(b => b.UserId == userId && b.BookId == bookId && b.ReturnedAt == null);

        if (alreadyBorrowed)
        {
            return BadRequest("Вече сте заели тази книга и тя не е върната.");
        }

        var book = await _db.Books.FirstOrDefaultAsync(b => b.Id == bookId);
        if (book is null) return NotFound("Книгата не е намерена.");

        if (book.CopiesAvailable <= 0)
            return BadRequest("Няма налични бройки.");

        var rec = new Borrowing { BookId = bookId, UserId = userId };
        book.CopiesAvailable -= 1;

        _db.Borrowings.Add(rec);
        await _db.SaveChangesAsync();

        return Ok(new { rec.Id });
    }

    [HttpPost("{borrowingId:int}/return")]
    public async Task<IActionResult> Return(int borrowingId)
    {
        var userId = _userManager.GetUserId(User)!;

        var rec = await _db.Borrowings
            .Include(x => x.Book)
            .FirstOrDefaultAsync(x => x.Id == borrowingId && x.UserId == userId);

        if (rec is null) return NotFound("Записът не е намерен.");
        if (rec.ReturnedAt != null) return BadRequest("Вече е върната.");

        rec.ReturnedAt = DateTime.UtcNow;
        rec.Book.CopiesAvailable += 1;

        await _db.SaveChangesAsync();
        return Ok();
    }
}
