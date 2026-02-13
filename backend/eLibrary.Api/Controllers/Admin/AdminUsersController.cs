using eLibrary.Api.Common;
using eLibrary.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminUsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q = null,
        [FromQuery] string status = "All",
        [FromQuery] string sort = "borrowings_desc",
        [FromQuery] int limit = 50
    )
    {
        if (limit <= 0 || limit > 500) limit = 50;

        var now = DateTime.Now;

        var adminRoleId = await _db.Roles.AsNoTracking()
            .Where(r => r.Name == Roles.Admin)
            .Select(r => r.Id)
            .FirstOrDefaultAsync();

        var adminIdsQ = _db.UserRoles.AsNoTracking()
            .Where(ur => ur.RoleId == adminRoleId)
            .Select(ur => ur.UserId);

        var usersQ = _db.Users.AsNoTracking()
            .Where(u => !adminIdsQ.Contains(u.Id));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLower();
            usersQ = usersQ.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                (u.UserName != null && u.UserName.ToLower().Contains(s)) ||
                (u.PhoneNumber != null && u.PhoneNumber.ToLower().Contains(s))
            );
        }

        var statusNorm = (status ?? "All").Trim().ToLower();
        if (statusNorm == "active")
        {
            usersQ = usersQ.Where(u =>
                _db.UserSubscriptions.Any(s =>
                    s.UserId == u.Id && s.IsActive && s.EndDate > now
                )
            );
        }
        else if (statusNorm == "inactive")
        {
            usersQ = usersQ.Where(u =>
                !_db.UserSubscriptions.Any(s =>
                    s.UserId == u.Id && s.IsActive && s.EndDate > now
                )
            );
        }

        var projQ = usersQ.Select(u => new
        {
            id = u.Id,
            email = u.Email,
            name = u.UserName,
            phone = u.PhoneNumber,

            subscriptionEnd = _db.UserSubscriptions
                .Where(s => s.UserId == u.Id && s.IsActive && s.EndDate > now)
                .OrderByDescending(s => s.EndDate)
                .Select(s => (DateTime?)s.EndDate)
                .FirstOrDefault(),

            borrowingsCount = _db.Borrowings.Count(b => b.UserId == u.Id),
            reviewsCount = _db.Reviews.Count(r => r.UserId == u.Id),
        });

        var sortNorm = (sort ?? "").Trim().ToLower();
        projQ = sortNorm switch
        {
            "borrowings_asc" => projQ.OrderBy(x => x.borrowingsCount).ThenBy(x => x.email),
            "borrowings_desc" => projQ.OrderByDescending(x => x.borrowingsCount).ThenBy(x => x.email),

            "reviews_asc" => projQ.OrderBy(x => x.reviewsCount).ThenBy(x => x.email),
            "reviews_desc" => projQ.OrderByDescending(x => x.reviewsCount).ThenBy(x => x.email),

            "subscription_end_asc" => projQ
                .OrderByDescending(x => x.subscriptionEnd != null)
                .ThenBy(x => x.subscriptionEnd)
                .ThenBy(x => x.email),

            "subscription_end_desc" => projQ
                .OrderByDescending(x => x.subscriptionEnd != null)
                .ThenByDescending(x => x.subscriptionEnd)
                .ThenBy(x => x.email),

            "activity_desc" => projQ
                .OrderByDescending(x => x.borrowingsCount + x.reviewsCount)
                .ThenBy(x => x.email),

            "activity_asc" => projQ
                .OrderBy(x => x.borrowingsCount + x.reviewsCount)
                .ThenBy(x => x.email),

            _ => projQ.OrderBy(x => x.email)
        };

        var list = await projQ.Take(limit).ToListAsync();
        return Ok(list);
    }

    public sealed class AdminGrantSubscriptionDto
    {
        public int PlanId { get; set; }
    }

    [HttpPost("{id}/subscription")]
    public async Task<IActionResult> GrantSubscription([FromRoute] string id, [FromBody] AdminGrantSubscriptionDto dto)
    {
        if (dto.PlanId <= 0) return BadRequest(new { message = "Invalid planId." });

        var now = DateTime.Now;

        var userExists = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == id);
        if (!userExists) return NotFound(new { message = "User not found." });

        var plan = await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.PlanId && p.IsActive);

        if (plan is null) return NotFound(new { message = "Plan not found." });

        var active = await _db.UserSubscriptions
            .Where(s => s.UserId == id && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();

        DateTime end;

        if (active is null)
        {
            end = now.AddDays(plan.DurationDays);

            _db.UserSubscriptions.Add(new eLibrary.Api.Models.Subscriptions.UserSubscription
            {
                UserId = id,
                PlanId = plan.Id,
                StartDate = now,
                EndDate = end,
                IsActive = true,
                PaymentId = null
            });
        }
        else
        {
            active.EndDate = active.EndDate.AddDays(plan.DurationDays);
            active.PlanId = plan.Id; 
            end = active.EndDate;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            userId = id,
            planId = plan.Id,
            subscriptionEnd = end
        });
    }
}