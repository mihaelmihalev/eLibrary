using System.Security.Claims;
using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/profile/fines")]
[Authorize]
public class ProfileFinesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfileFinesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var rows = await _db.Borrowings
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.FineAmount > 0 && !b.FinePaid)
            .Select(b => b.FineAmount)
            .ToListAsync(ct);

        var total = rows.Sum();
        var count = rows.Count;

        return Ok(new { count, total });
    }

    [HttpPost("pay-all")]
    public async Task<IActionResult> PayAll(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var fines = await _db.Borrowings
            .Where(b => b.UserId == userId && b.FineAmount > 0 && !b.FinePaid)
            .ToListAsync(ct);

        if (fines.Count == 0)
            return Ok(new { ok = true, paid = 0m });

        var total = fines.Sum(x => x.FineAmount);

        foreach (var b in fines)
            b.FinePaid = true;

        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = "Info",
            Title = "Платени неустойки",
            Message = $"Успешно платихте неустойки на обща стойност {total:0.00} лв.",
            BorrowingId = null,
            CreatedAt = DateTime.Now
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true, paid = total });
    }
}
