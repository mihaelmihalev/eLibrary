using eLibrary.Api.Data;
using eLibrary.Api.Models.Subscriptions;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace eLibrary.Api.Services;

public interface IReceiptService
{
    Task<string> GenerateReceiptPdfAsync(string receiptNo, SubscriptionRequest req, Payment payment, DateTime start, DateTime end);
    Task<string> GenerateNextReceiptNumberAsync();
}

public class ReceiptService : IReceiptService
{
    private readonly IWebHostEnvironment _env;
    private readonly AppDbContext _db;

    public ReceiptService(IWebHostEnvironment env, AppDbContext db)
    {
        _env = env;
        _db = db;
    }

    public async Task<string> GenerateNextReceiptNumberAsync()
    {
        var count = await _db.Payments.CountAsync() + 1;
        return $"R-{DateTime.UtcNow:yyyy}-{count:000000}";
    }

    public Task<string> GenerateReceiptPdfAsync(
        string receiptNo,
        SubscriptionRequest req,
        Payment payment,
        DateTime start,
        DateTime end)
    {
        var folder = Path.Combine(_env.WebRootPath ?? "wwwroot", "receipts");
        Directory.CreateDirectory(folder);

        var fileName = $"{receiptNo}.pdf";
        var fullPath = Path.Combine(folder, fileName);

        var methodBg = payment.Method switch
        {
            PaymentMethod.Cash => "В брой",
            PaymentMethod.Card => "Карта",
            PaymentMethod.BankTransfer => "Банков превод",
            _ => "Неизвестен"
        };

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(20);

                page.Content().Column(col =>
                {
                    col.Spacing(4);

                    col.Item().Text("КАСОВА БЕЛЕЖКА").FontSize(18).Bold();
                    col.Item().Text($"Номер: {receiptNo}");
                    col.Item().Text($"Дата и час: {DateTime.UtcNow:dd.MM.yyyy HH:mm}");

                    col.Item().PaddingTop(8).Text("ДЕТАЙЛИ").Bold();
                    col.Item().Text($"План: {req.Plan.Name}");
                    col.Item().Text($"Период: {start:dd.MM.yyyy} – {end:dd.MM.yyyy}");
                    col.Item().Text($"Сума: {payment.Amount:0.00} лв.");

                    col.Item().PaddingTop(8).Text("ПЛАЩАНЕ").Bold();
                    col.Item().Text($"Начин на плащане: {methodBg}");
                });
            });
        }).GeneratePdf(fullPath);

        return Task.FromResult($"/receipts/{fileName}");
    }
}
