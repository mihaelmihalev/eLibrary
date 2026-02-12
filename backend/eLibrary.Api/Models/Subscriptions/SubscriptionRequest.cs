namespace eLibrary.Api.Models.Subscriptions;

public class SubscriptionRequest
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public int PlanId { get; set; }

    public SubscriptionRequestStatus Status { get; set; } 
    public DateTime RequestedAt { get; set; }

    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }

    public SubscriptionPlan Plan { get; set; } = null!;
}
