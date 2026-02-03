using eLibrary.Api.Models.Subscriptions;

namespace eLibrary.Api.DTOs.Subscriptions;

public record PayDto(PaymentMethod Method, string? PaymentReference);
