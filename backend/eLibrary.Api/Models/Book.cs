namespace eLibrary.Api.Models
{
    public class Book
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Isbn { get; set; }
        public string? CoverUrl { get; set; }
        public DateTime? PublishedOn { get; set; }
        public int CopiesTotal { get; set; }
        public int CopiesAvailable { get; set; }
        public string? Author { get; set; }
        public string? Genre { get; set; }
    }
}
