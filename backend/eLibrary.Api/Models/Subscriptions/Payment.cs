namespace eLibrary.Api.Models.Subscriptions;

public class Payment
{
    public int Id { get; set; }
    public int SubscriptionRequestId { get; set; }

    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.Card;
    public PaymentStatus Status { get; set; }

    public string? PaymentReference { get; set; }

    public string? RecordedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public string? ReceiptNumber { get; set; }
    public string? ReceiptPdfPath { get; set; }
}
