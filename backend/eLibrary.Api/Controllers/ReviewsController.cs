using System.Security.Claims;
using eLibrary.Api.Data;
using eLibrary.Api.DTOs.Reviews;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/books/{bookId:int}/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ReviewDto>>> GetForBook(int bookId)
    {
        var exists = await _db.Books.AsNoTracking().AnyAsync(b => b.Id == bookId);
        if (!exists) return NotFound("Book not found.");

        var items = await _db.Reviews
            .AsNoTracking()
            .Where(r => r.BookId == bookId)
            .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id,
                r.BookId,
                r.UserId,
                r.User.UserName ?? r.User.Email ?? "User",
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.UpdatedAt
            ))
            .ToListAsync();

        return Ok(items);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Upsert(int bookId, CreateReviewDto dto)
    {
        var exists = await _db.Books.AsNoTracking().AnyAsync(b => b.Id == bookId);
        if (!exists) return NotFound("Book not found.");

        if (User.IsInRole("Admin")) return Forbid();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var rating = dto.Rating;
        if (rating < 1 || rating > 5) return BadRequest("Rating must be between 1 and 5.");

        var comment = (dto.Comment ?? "").Trim();
        if (comment.Length > 500) return BadRequest("Comment max length is 500.");

        var review = await _db.Reviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.BookId == bookId && r.UserId == userId);

        var now = DateTime.Now;

        if (review is null)
        {
            review = new Review
            {
                BookId = bookId,
                UserId = userId,
                Rating = rating,
                Comment = comment,
                CreatedAt = now
            };
            _db.Reviews.Add(review);
        }
        else
        {
            review.Rating = rating;
            review.Comment = comment;
            review.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var userName = user?.UserName ?? user?.Email ?? "User";

        return Ok(new ReviewDto(
            review.Id,
            review.BookId,
            review.UserId,
            userName,
            review.Rating,
            review.Comment,
            review.CreatedAt,
            review.UpdatedAt
        ));
    }

    [Authorize]
    [HttpDelete("{reviewId:int}")]
    public async Task<IActionResult> Delete(int bookId, int reviewId)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId && r.BookId == bookId);
        if (review is null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var isOwner = review.UserId == userId;

        if (!isAdmin && !isOwner) return Forbid();

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
