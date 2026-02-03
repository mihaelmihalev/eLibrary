namespace eLibrary.Api.Models.Subscriptions;

public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int DurationDays { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
}
