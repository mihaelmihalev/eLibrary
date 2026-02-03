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
            [FromQuery] string? sortBy = "id",
            [FromQuery] string? sortDir = "asc",
            [FromQuery] string? search = null,
            [FromQuery] string? author = null,
            [FromQuery] string? genre = null,
            [FromQuery] bool? availableOnly = null
        )
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 10 : pageSize > 100 ? 100 : pageSize;

            sortBy = (sortBy ?? "id").Trim().ToLowerInvariant();
            sortDir = (sortDir ?? "asc").Trim().ToLowerInvariant();
            var desc = sortDir == "desc";

            var q = _db.Books.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                q = q.Where(b =>
                    b.Title.Contains(s) ||
                    (b.Author != null && b.Author.Contains(s)) ||
                    (b.Isbn != null && b.Isbn.Contains(s))
                );
            }

            if (!string.IsNullOrWhiteSpace(author))
            {
                var a = author.Trim();
                q = q.Where(b => b.Author != null && b.Author.Contains(a));
            }

            if (!string.IsNullOrWhiteSpace(genre))
            {
                var g = genre.Trim();
                q = q.Where(b => b.Genre != null && b.Genre.Contains(g));
            }

            if (availableOnly == true)
            {
                q = q.Where(b => b.CopiesAvailable > 0);
            }

            q = sortBy switch
            {
                "title" => desc ? q.OrderByDescending(b => b.Title) : q.OrderBy(b => b.Title),
                "author" => desc ? q.OrderByDescending(b => b.Author) : q.OrderBy(b => b.Author),
                "genre" => desc ? q.OrderByDescending(b => b.Genre) : q.OrderBy(b => b.Genre),
                "publishedon" => desc ? q.OrderByDescending(b => b.PublishedOn) : q.OrderBy(b => b.PublishedOn),
                "copiesavailable" => desc ? q.OrderByDescending(b => b.CopiesAvailable) : q.OrderBy(b => b.CopiesAvailable),
                "avgrating" => q,
                "id" or _ => desc ? q.OrderByDescending(b => b.Id) : q.OrderBy(b => b.Id),
            };

            var total = await q.CountAsync();

            var booksPage = await q
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Isbn,
                    b.CoverUrl,
                    b.PublishedOn,
                    b.CopiesTotal,
                    b.CopiesAvailable,
                    b.Author,
                    b.Genre
                })
                .ToListAsync();

            var bookIds = booksPage.Select(b => b.Id).ToArray();

            var ratings = await _db.Reviews
                .AsNoTracking()
                .Where(r => bookIds.Contains(r.BookId))
                .GroupBy(r => r.BookId)
                .Select(g => new
                {
                    BookId = g.Key,
                    Avg = g.Average(x => (double?)x.Rating) ?? 0.0,
                    Cnt = g.Count()
                })
                .ToListAsync();

            var ratingsMap = ratings.ToDictionary(x => x.BookId, x => (x.Avg, x.Cnt));

            var items = booksPage.Select(b =>
            {
                var has = ratingsMap.TryGetValue(b.Id, out var rc);
                return new BookListItemDto(
                    b.Id,
                    b.Title,
                    b.Isbn,
                    b.CoverUrl,
                    b.PublishedOn,
                    b.CopiesTotal,
                    b.CopiesAvailable,
                    b.Author,
                    b.Genre,
                    has ? rc.Avg : 0.0,
                    has ? rc.Cnt : 0
                );
            }).ToList();

            if (sortBy == "avgrating")
            {
                items = desc
                    ? items.OrderByDescending(i => i.AvgRating).ThenBy(i => i.Id).ToList()
                    : items.OrderBy(i => i.AvgRating).ThenBy(i => i.Id).ToList();
            }

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
                    try { System.IO.File.Delete(oldPath); } catch {}
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
                    try { System.IO.File.Delete(oldPath); } catch {}
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
