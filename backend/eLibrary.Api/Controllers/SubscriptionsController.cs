using eLibrary.Api.Data;
using eLibrary.Api.DTOs.Subscriptions;
using eLibrary.Api.Models;
using eLibrary.Api.Models.Subscriptions;
using eLibrary.Api.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;

    public SubscriptionsController(AppDbContext db, UserManager<User> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _db.SubscriptionPlans
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.DurationDays)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.DurationDays,
                p.Price
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost("purchase")]
    [Authorize(Roles = "User,Admin")]
    public async Task<IActionResult> Purchase([FromBody] PurchaseDto dto)
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var plan = await _db.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == dto.PlanId && p.IsActive);

        if (plan is null)
            return NotFound(new { message = "Plan not found." });

        var now = DateTime.Now;

        var token = (dto.CardToken ?? string.Empty)
            .Replace(" ", "")
            .Trim();

        var rejected = token.EndsWith("1111", StringComparison.Ordinal);

        var req = new SubscriptionRequest
        {
            UserId = userId,
            PlanId = plan.Id,
            Status = rejected
                ? SubscriptionRequestStatus.Rejected
                : SubscriptionRequestStatus.Approved,
            RequestedAt = now,
            ReviewedAt = now,
            ReviewedByUserId = userId,
            ReviewNote = "Auto " + (rejected ? "rejected" : "approved") + " (virtual payment)"
        };

        _db.SubscriptionRequests.Add(req);
        await _db.SaveChangesAsync();

        var payment = new Payment
        {
            SubscriptionRequestId = req.Id,
            Amount = plan.Price,
            Method = PaymentMethod.Card,
            Status = rejected ? PaymentStatus.Rejected : PaymentStatus.Paid,
            PaymentReference = Guid.NewGuid().ToString("N"),
            CreatedAt = now,
            PaidAt = rejected ? null : now
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        if (rejected)
        {
            return BadRequest(new
            {
                message = "Плащане: отказано (невалидна карта/няма баланс).",
                requestId = req.Id,
                paymentId = payment.Id,
                status = payment.Status.ToString()
            });
        }

        var active = await _db.UserSubscriptions
            .Where(s => s.UserId == userId && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();

        DateTime end;

        if (active is null)
        {
            end = now.AddDays(plan.DurationDays);

            _db.UserSubscriptions.Add(new UserSubscription
            {
                UserId = userId,
                PlanId = plan.Id,
                StartDate = now,
                EndDate = end,
                IsActive = true,
                PaymentId = payment.Id
            });
        }
        else
        {
            var newEnd = active.EndDate.AddDays(plan.DurationDays);
            active.EndDate = newEnd.Date.Add(now.TimeOfDay);
            active.PaymentId = payment.Id;
            end = active.EndDate;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            requestId = req.Id,
            paymentId = payment.Id,
            status = payment.Status.ToString(),

            subscriptionEnd = end,

            subscriptionEndText = DateFmt.Bg(end)
        });
    }

    [HttpGet("me")]
    [Authorize(Roles = "User,Admin")]
    public async Task<IActionResult> MySubscription()
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var now = DateTime.Now;

        var sub = await _db.UserSubscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .Select(s => new
            {
                s.Id,
                s.PlanId,
                s.StartDate,
                s.EndDate,
                StartDateText = DateFmt.Bg(s.StartDate),
                EndDateText = DateFmt.Bg(s.EndDate)
            })
            .FirstOrDefaultAsync();

        return Ok(sub);
    }
}
