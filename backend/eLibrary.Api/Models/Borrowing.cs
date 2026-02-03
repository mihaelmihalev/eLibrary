namespace eLibrary.Api.Models;
public class Borrowing
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!; 

    public DateTime BorrowedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReturnedAt { get; set; }

    public bool IsReturned => ReturnedAt != null;
}
