using eLibrary.Api.Data;
using eLibrary.Api.DTOs.Subscriptions;
using eLibrary.Api.Models;
using eLibrary.Api.Models.Subscriptions;
using eLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/admin/subscriptions")]
[Authorize(Roles = "Admin")]
public class AdminSubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly IReceiptService _receiptService;

    public AdminSubscriptionsController(AppDbContext db, UserManager<User> userManager, IReceiptService receiptService)
    {
        _db = db;
        _userManager = userManager;
        _receiptService = receiptService;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> Pending()
    {
        var list = await _db.SubscriptionRequests
            .Include(r => r.Plan)
            .Where(r => r.Status == SubscriptionRequestStatus.Pending)
            .OrderBy(r => r.RequestedAt)
            .Select(r => new
            {
                r.Id,
                r.UserId,
                plan = r.Plan.Name,
                r.RequestedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("active")]
    public async Task<IActionResult> Active()
    {
        var now = DateTime.UtcNow;

        var list = await (
            from s in _db.UserSubscriptions.AsNoTracking()
            join p in _db.SubscriptionPlans on s.PlanId equals p.Id
            join u in _db.Users.AsNoTracking() on s.UserId equals u.Id
            where s.IsActive && s.EndDate > now
            orderby s.EndDate descending
            select new
            {
                s.Id,
                userId = s.UserId,
                userName = u.UserName,
                email = u.Email,
                plan = p.Name,
                s.StartDate,
                s.EndDate
            }
        ).ToListAsync();

        return Ok(list);
    }



    [HttpPost("approve/{requestId:int}")]
    public async Task<IActionResult> Approve(int requestId)
    {
        var reviewerId = _userManager.GetUserId(User);
        if (reviewerId is null) return Unauthorized();

        var now = DateTime.UtcNow;

        var req = await _db.SubscriptionRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId);

        if (req is null) return NotFound("Request not found.");
        if (req.Status != SubscriptionRequestStatus.Pending) return BadRequest("Request is not pending.");

        var payment = await _db.Payments
            .FirstOrDefaultAsync(p => p.SubscriptionRequestId == requestId);

        if (payment is null)
        {
            payment = new Payment
            {
                SubscriptionRequestId = requestId,
                Amount = req.Plan.Price,
                Method = PaymentMethod.Cash,
                Status = PaymentStatus.Paid,
                PaymentReference = null,
                RecordedByUserId = reviewerId,
                CreatedAt = now,
                PaidAt = now
            };

            _db.Payments.Add(payment);
        }
        else
        {
            payment.Status = PaymentStatus.Paid;
            payment.PaidAt = now;
            payment.RecordedByUserId = reviewerId;

            payment.PaymentReference = null;

            if (payment.Amount <= 0)
                payment.Amount = req.Plan.Price;
        }

        req.Status = SubscriptionRequestStatus.Approved;
        req.ReviewedAt = now;
        req.ReviewedByUserId = reviewerId;

        payment.ReceiptNumber = await _receiptService.GenerateNextReceiptNumberAsync();

        var active = await _db.UserSubscriptions
            .Where(s => s.UserId == req.UserId && s.IsActive && s.EndDate > now)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();

        DateTime start, end;

        if (active is null)
        {
            start = now;
            end = now.AddDays(req.Plan.DurationDays);

            _db.UserSubscriptions.Add(new UserSubscription
            {
                UserId = req.UserId,
                PlanId = req.PlanId,
                StartDate = start,
                EndDate = end,
                IsActive = true,
                PaymentId = payment.Id
            });
        }
        else
        {
            start = active.StartDate;
            active.EndDate = active.EndDate.AddDays(req.Plan.DurationDays);
            end = active.EndDate;
            active.PaymentId = payment.Id;
        }

        var pdfPath = await _receiptService.GenerateReceiptPdfAsync(
            payment.ReceiptNumber!,
            req,
            payment,
            now,
            end
        );
        payment.ReceiptPdfPath = pdfPath;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            requestId = req.Id,
            paymentId = payment.Id,
            receiptNumber = payment.ReceiptNumber,
            receiptPdf = payment.ReceiptPdfPath,
            subscriptionEnd = end
        });
    }

    [HttpPost("reject/{requestId:int}")]
    public async Task<IActionResult> Reject(int requestId, [FromBody] RejectDto dto)
    {
        var reviewerId = _userManager.GetUserId(User);
        if (reviewerId is null) return Unauthorized();

        var now = DateTime.UtcNow;

        var req = await _db.SubscriptionRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (req is null) return NotFound("Request not found.");

        req.Status = SubscriptionRequestStatus.Rejected;
        req.ReviewedAt = now;
        req.ReviewedByUserId = reviewerId;
        req.ReviewNote = dto.Note;

        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.SubscriptionRequestId == requestId);
        if (payment != null)
            payment.Status = PaymentStatus.Rejected;

        await _db.SaveChangesAsync();
        return Ok();
    }
}
