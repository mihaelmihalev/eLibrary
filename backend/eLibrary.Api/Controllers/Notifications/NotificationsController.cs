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
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;

    public NotificationsController(AppDbContext db, UserManager<User> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool unreadOnly = false, [FromQuery] int limit = 50)
    {
        if (limit <= 0 || limit > 200) limit = 50;

        var userId = _userManager.GetUserId(User)!;

        var q = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => n.ReadAt == null);

        var items = await q
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.CreatedAt,
                n.ReadAt,
                n.BorrowingId
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("count")]
    public async Task<IActionResult> Count([FromQuery] bool unreadOnly = true)
    {
        var userId = _userManager.GetUserId(User)!;

        var q = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => n.ReadAt == null);

        var cnt = await q.CountAsync();
        return Ok(new { count = cnt });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = _userManager.GetUserId(User)!;

        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (n is null) return NotFound();

        if (n.ReadAt == null)
        {
            n.ReadAt = DateTime.Now;
            await _db.SaveChangesAsync();
        }

        return Ok();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = _userManager.GetUserId(User)!;

        var now = DateTime.Now;
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && n.ReadAt == null)
            .ToListAsync();

        foreach (var n in unread)
            n.ReadAt = now;

        await _db.SaveChangesAsync();
        return Ok();
    }
}
