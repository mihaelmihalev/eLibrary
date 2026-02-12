using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace eLibrary.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BooksController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public BooksController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        public record BookListItemDto(
            int Id,
            string Title,
            string? Isbn,
            string? CoverUrl,
            DateTime? PublishedOn,
            int CopiesTotal,
            int CopiesAvailable,
            string? Author,
            string? Genre,
            double AvgRating,
            int ReviewsCount
        );

        public record BookDetailsDto(
            int Id,
            string Title,
            string? Isbn,
            string? CoverUrl,
            DateTime? PublishedOn,
            int CopiesTotal,
            int CopiesAvailable,
            string? Author,
            string? Genre,
            double AvgRating,
            int ReviewsCount
        );

        public record BookUpsertDto(
            string Title,
            string? Author,
            string? Genre,
            string? Isbn,
            DateTime? PublishedOn,
            int CopiesTotal,
            int CopiesAvailable
        );

        public record PagedResult<T>(
            int Page,
            int PageSize,
            int TotalCount,
            IReadOnlyList<T> Items
        );

        [HttpGet]
        public async Task<ActionResult<PagedResult<BookListItemDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "newest",
            [FromQuery] string? sortDir = "desc",
            [FromQuery] string? search = null,
            [FromQuery] string? author = null,
            [FromQuery] string? genre = null,
            [FromQuery] bool? availableOnly = null
        )
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 10 : pageSize > 100 ? 100 : pageSize;

            sortBy = (sortBy ?? "newest").Trim().ToLowerInvariant();
            sortDir = (sortDir ?? "desc").Trim().ToLowerInvariant();
            var desc = sortDir == "desc";

            var qBooks = _db.Books.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                qBooks = qBooks.Where(b =>
                    b.Title.Contains(s) ||
                    (b.Author != null && b.Author.Contains(s)) ||
                    (b.Isbn != null && b.Isbn.Contains(s))
                );
            }

            if (!string.IsNullOrWhiteSpace(author))
            {
                var a = author.Trim();
                qBooks = qBooks.Where(b => b.Author != null && b.Author.Contains(a));
            }

            if (!string.IsNullOrWhiteSpace(genre))
            {
                var g = genre.Trim();
                qBooks = qBooks.Where(b => b.Genre != null && b.Genre.Contains(g));
            }

            if (availableOnly == true)
            {
                qBooks = qBooks.Where(b => b.CopiesAvailable > 0);
            }

            var q =
                from b in qBooks
                select new
                {
                    b.Id,
                    b.Title,
                    b.Isbn,
                    b.CoverUrl,
                    b.PublishedOn,
                    b.CopiesTotal,
                    b.CopiesAvailable,
                    b.Author,
                    b.Genre,

                    AvgRating = _db.Reviews
                        .AsNoTracking()
                        .Where(r => r.BookId == b.Id)
                        .Average(r => (double?)r.Rating) ?? 0.0,

                    ReviewsCount = _db.Reviews
                        .AsNoTracking()
                        .Count(r => r.BookId == b.Id),

                    BorrowingsCount = _db.Borrowings
                        .AsNoTracking()
                        .Count(br => br.BookId == b.Id)
                };

            q = sortBy switch
            {
                "rating" => desc
                    ? q.OrderByDescending(x => x.AvgRating)
                        .ThenByDescending(x => x.ReviewsCount)
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => x.AvgRating)
                        .ThenBy(x => x.ReviewsCount)
                        .ThenBy(x => x.Id),

                "reviews" => desc
                    ? q.OrderByDescending(x => x.ReviewsCount)
                        .ThenByDescending(x => x.AvgRating)
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => x.ReviewsCount)
                        .ThenBy(x => x.AvgRating)
                        .ThenBy(x => x.Id),

                "borrowed" => desc
                    ? q.OrderByDescending(x => x.BorrowingsCount)
                        .ThenByDescending(x => x.AvgRating)
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => x.BorrowingsCount)
                        .ThenBy(x => x.AvgRating)
                        .ThenBy(x => x.Id),

                "available" => desc
                    ? q.OrderByDescending(x => x.CopiesAvailable)
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => x.CopiesAvailable)
                        .ThenBy(x => x.Id),

                "newest" => desc ? q.OrderByDescending(x => x.Id) : q.OrderBy(x => x.Id),

                "oldest" => q.OrderBy(x => x.Id),

                "title" => desc
                    ? q.OrderByDescending(x => (x.Title ?? "").Trim())
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => (x.Title ?? "").Trim())
                        .ThenBy(x => x.Id),

                "author" => desc
                    ? q.OrderByDescending(x => (x.Author ?? "").Trim())
                        .ThenByDescending(x => (x.Title ?? "").Trim())
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => (x.Author ?? "").Trim())
                        .ThenBy(x => (x.Title ?? "").Trim())
                        .ThenBy(x => x.Id),

                "genre" => desc
                    ? q.OrderByDescending(x => (x.Genre ?? "").Trim())
                        .ThenByDescending(x => (x.Title ?? "").Trim())
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => (x.Genre ?? "").Trim())
                        .ThenBy(x => (x.Title ?? "").Trim())
                        .ThenBy(x => x.Id),

                "publishedon" => desc
                    ? q.OrderByDescending(x => x.PublishedOn)
                        .ThenByDescending(x => x.Id)
                    : q.OrderBy(x => x.PublishedOn)
                        .ThenBy(x => x.Id),

                "id" => desc ? q.OrderByDescending(x => x.Id) : q.OrderBy(x => x.Id),

                _ => q.OrderByDescending(x => x.Id),
            };

            var total = await q.CountAsync();

            var items = await q
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new BookListItemDto(
                    x.Id,
                    x.Title,
                    x.Isbn,
                    x.CoverUrl,
                    x.PublishedOn,
                    x.CopiesTotal,
                    x.CopiesAvailable,
                    x.Author,
                    x.Genre,
                    x.AvgRating,
                    x.ReviewsCount
                ))
                .ToListAsync();

            return Ok(new PagedResult<BookListItemDto>(page, pageSize, total, items));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<BookDetailsDto>> GetById(int id)
        {
            var b = await _db.Books.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (b is null) return NotFound();

            var rating = await _db.Reviews
                .AsNoTracking()
                .Where(r => r.BookId == id)
                .GroupBy(r => r.BookId)
                .Select(g => new
                {
                    Avg = g.Average(x => (double?)x.Rating) ?? 0.0,
                    Cnt = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(new BookDetailsDto(
                b.Id,
                b.Title,
                b.Isbn,
                b.CoverUrl,
                b.PublishedOn,
                b.CopiesTotal,
                b.CopiesAvailable,
                b.Author,
                b.Genre,
                rating?.Avg ?? 0.0,
                rating?.Cnt ?? 0
            ));
        }

        [Authorize(Policy = "CanManageBooks")]
        [HttpPost]
        public async Task<ActionResult<BookDetailsDto>> Create([FromBody] BookUpsertDto dto)
        {
            var title = (dto.Title ?? "").Trim();
            if (title.Length == 0) return BadRequest("Title is required.");
            if (dto.CopiesTotal < 0) return BadRequest("CopiesTotal cannot be negative.");
            if (dto.CopiesAvailable < 0) return BadRequest("CopiesAvailable cannot be negative.");
            if (dto.CopiesAvailable > dto.CopiesTotal) return BadRequest("CopiesAvailable cannot be greater than CopiesTotal.");

            var book = new Book
            {
                Title = title,
                Author = string.IsNullOrWhiteSpace(dto.Author) ? null : dto.Author.Trim(),
                Genre = string.IsNullOrWhiteSpace(dto.Genre) ? null : dto.Genre.Trim(),
                Isbn = string.IsNullOrWhiteSpace(dto.Isbn) ? null : dto.Isbn.Trim(),
                PublishedOn = dto.PublishedOn,
                CopiesTotal = dto.CopiesTotal,
                CopiesAvailable = dto.CopiesAvailable,
            };

            _db.Books.Add(book);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = book.Id }, new BookDetailsDto(
                book.Id,
                book.Title,
                book.Isbn,
                book.CoverUrl,
                book.PublishedOn,
                book.CopiesTotal,
                book.CopiesAvailable,
                book.Author,
                book.Genre,
                0.0,
                0
            ));
        }

        [Authorize(Policy = "CanManageBooks")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] BookUpsertDto dto)
        {
            var book = await _db.Books.FirstOrDefaultAsync(b => b.Id == id);
            if (book is null) return NotFound();

            var title = (dto.Title ?? "").Trim();
            if (title.Length == 0) return BadRequest("Title is required.");
            if (dto.CopiesTotal < 0) return BadRequest("CopiesTotal cannot be negative.");
            if (dto.CopiesAvailable < 0) return BadRequest("CopiesAvailable cannot be negative.");
            if (dto.CopiesAvailable > dto.CopiesTotal) return BadRequest("CopiesAvailable cannot be greater than CopiesTotal.");

            book.Title = title;
            book.Author = string.IsNullOrWhiteSpace(dto.Author) ? null : dto.Author.Trim();
            book.Genre = string.IsNullOrWhiteSpace(dto.Genre) ? null : dto.Genre.Trim();
            book.Isbn = string.IsNullOrWhiteSpace(dto.Isbn) ? null : dto.Isbn.Trim();
            book.PublishedOn = dto.PublishedOn;
            book.CopiesTotal = dto.CopiesTotal;
            book.CopiesAvailable = dto.CopiesAvailable;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize(Policy = "CanManageBooks")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var book = await _db.Books.FirstOrDefaultAsync(b => b.Id == id);
            if (book is null) return NotFound();

            if (!string.IsNullOrWhiteSpace(book.CoverUrl) && book.CoverUrl.StartsWith("/uploads/covers/"))
            {
                var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "covers");
                var oldFileName = Path.GetFileName(book.CoverUrl);
                var oldPath = Path.Combine(uploadsRoot, oldFileName);
                if (System.IO.File.Exists(oldPath))
                {
                    try { System.IO.File.Delete(oldPath); } catch { }
                }
            }

            _db.Books.Remove(book);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize(Policy = "CanManageBooks")]
        [HttpPost("{id:int}/cover")]
        [RequestSizeLimit(8 * 1024 * 1024)]
        public async Task<ActionResult<object>> UploadCover(int id, [FromForm] IFormFile file)
        {
            if (file is null || file.Length == 0) return BadRequest("No file uploaded.");
            if (file.Length > 8 * 1024 * 1024) return BadRequest("File too large (max 8MB).");

            var book = await _db.Books.FirstOrDefaultAsync(b => b.Id == id);
            if (book is null) return NotFound();

            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "image/jpeg",
                "image/png",
                "image/webp"
            };

            if (!allowed.Contains(file.ContentType))
                return BadRequest("Invalid file type. Allowed: jpg, png, webp.");

            var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "covers");
            Directory.CreateDirectory(uploadsRoot);

            if (!string.IsNullOrWhiteSpace(book.CoverUrl) && book.CoverUrl.StartsWith("/uploads/covers/"))
            {
                var oldFileName = Path.GetFileName(book.CoverUrl);
                var oldPath = Path.Combine(uploadsRoot, oldFileName);
                if (System.IO.File.Exists(oldPath))
                {
                    try { System.IO.File.Delete(oldPath); } catch { }
                }
            }

            var ext = file.ContentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => Path.GetExtension(file.FileName)
            };

            var safeName = $"{id}_{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, safeName);

            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/covers/{safeName}";
            book.CoverUrl = url;

            await _db.SaveChangesAsync();

            return Ok(new { coverUrl = url });
        }
    }
}
