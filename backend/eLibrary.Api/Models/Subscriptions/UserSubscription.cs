using eLibrary.Api.Models.Subscriptions;

namespace eLibrary.Api.Models.Subscriptions;

public class UserSubscription
{
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    public int PlanId { get; set; }
    public SubscriptionPlan Plan { get; set; } = null!;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public bool IsActive { get; set; }

    public int PaymentId { get; set; }
}
