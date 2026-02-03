using eLibrary.Api.Data;
using eLibrary.Api.DTOs.Subscriptions;
using eLibrary.Api.Models;
using eLibrary.Api.Models.Subscriptions;
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

    [HttpPost("request/{planId:int}")]
    [Authorize(Roles = "User,Admin")]
    public async Task<IActionResult> RequestPlan(int planId)
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var planExists = await _db.SubscriptionPlans.AnyAsync(p => p.Id == planId && p.IsActive);
        if (!planExists) return NotFound("Plan not found.");

        var req = new SubscriptionRequest
        {
            UserId = userId,
            PlanId = planId,
            Status = SubscriptionRequestStatus.Pending
        };

        _db.SubscriptionRequests.Add(req);
        await _db.SaveChangesAsync();

        return Ok(new { requestId = req.Id, status = req.Status.ToString() });
    }

    [HttpPost("pay/{requestId:int}")]
    [Authorize(Roles = "User,Admin")]
    public async Task<IActionResult> Pay(int requestId, [FromBody] PayDto dto)
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var req = await _db.SubscriptionRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId);

        if (req is null) return NotFound("Request not found.");
        if (req.UserId != userId) return Forbid();
        if (req.Status != SubscriptionRequestStatus.Pending) return BadRequest("Request is not pending.");

        var existingPayment = await _db.Payments
            .FirstOrDefaultAsync(p => p.SubscriptionRequestId == requestId);

        if (existingPayment != null)
            return Ok(new { paymentId = existingPayment.Id, status = existingPayment.Status.ToString() });

        var payment = new Payment
        {
            SubscriptionRequestId = req.Id,
            Amount = req.Plan.Price,
            Status = PaymentStatus.Pending,
            Method = dto.Method,
            PaymentReference = dto.PaymentReference,
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(new { paymentId = payment.Id, status = payment.Status.ToString() });
    }

    [HttpGet("me")]
    [Authorize(Roles = "User,Admin")]
    public async Task<IActionResult> MySubscription()
    {
        var userId = _userManager.GetUserId(User);
        if (userId is null) return Unauthorized();

        var now = DateTime.UtcNow;

        var sub = await _db.UserSubscriptions
            .Where(s => s.UserId == userId && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .Select(s => new
            {
                s.Id,
                s.PlanId,
                s.StartDate,
                s.EndDate
            })
            .FirstOrDefaultAsync();

        return Ok(sub);
    }
}
