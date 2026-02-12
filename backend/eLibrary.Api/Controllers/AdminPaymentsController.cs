using eLibrary.Api.Data;
using eLibrary.Api.Models.Subscriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/payments")]
[Authorize(Roles = "Admin")]
public class AdminPaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminPaymentsController(AppDbContext db)
    {
        _db = db;
    }

   [HttpGet]
public async Task<IActionResult> List(
    [FromQuery] string? status = null,
    [FromQuery] int limit = 100
)
{
    if (limit <= 0 || limit > 500)
        limit = 100;

    PaymentStatus? parsedStatus = null;

    if (!string.IsNullOrWhiteSpace(status))
    {
        if (!Enum.TryParse<PaymentStatus>(status, true, out var parsed))
        {
            return BadRequest(new
            {
                message = "Invalid status. Allowed values: Paid, Rejected."
            });
        }

        parsedStatus = parsed;
    }

    var baseQuery =
        from pay in _db.Payments.AsNoTracking()
        join req in _db.SubscriptionRequests.AsNoTracking()
            on pay.SubscriptionRequestId equals req.Id
        join plan in _db.SubscriptionPlans.AsNoTracking()
            on req.PlanId equals plan.Id
        join u in _db.Users.AsNoTracking()
            on req.UserId equals u.Id
        select new
        {
            pay.Id,
            pay.CreatedAt,
            pay.PaidAt,
            pay.Amount,
            pay.Method,
            pay.Status,
            userId = u.Id,
            userName = u.UserName,
            email = u.Email,
            plan = plan.Name
        };

    if (parsedStatus.HasValue)
    {
        baseQuery = baseQuery.Where(x => x.Status == parsedStatus.Value);
    }

    var list = await baseQuery
        .OrderByDescending(x => x.PaidAt ?? x.CreatedAt)
        .ThenByDescending(x => x.CreatedAt)
        .Take(limit)
        .Select(x => new
        {
            x.Id,
            createdAt = x.CreatedAt,
            paidAt = x.PaidAt,
            amount = x.Amount,
            method = x.Method.ToString(),
            status = x.Status.ToString(),
            x.userId,
            x.userName,
            x.email,
            x.plan
        })
        .ToListAsync();

    return Ok(list);
}
}
