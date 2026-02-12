using System.ComponentModel.DataAnnotations;

namespace eLibrary.Api.Models;

public class Notification
{
    public int Id { get; set; }

    [MaxLength(450)]
    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    [MaxLength(50)]
    public string Type { get; set; } = "Info";

    [MaxLength(120)]
    public string Title { get; set; } = null!;

    [MaxLength(500)]
    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }

    public int? BorrowingId { get; set; }
}
