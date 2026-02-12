using System.ComponentModel.DataAnnotations;

namespace eLibrary.Api.Models;

public class Review
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(500)]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
