using eLibrary.Api.Data;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace eLibrary.Api.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class BooksController : ControllerBase
    {
        private readonly AppDbContext _db;
        public BooksController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<PagedResult<Book>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? author,
            [FromQuery] string? genre,
            [FromQuery] bool? availableOnly,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            IQueryable<Book> query = _db.Books.AsNoTracking();

            query = ApplyFilters(query, search, author, genre, availableOnly);

            var totalCount = await query.CountAsync();

            query = ApplySorting(query, sortBy, sortDir);

            var items = await ApplyPaging(query, page, pageSize).ToListAsync();

            return Ok(new PagedResult<Book>(items, totalCount, page, pageSize));
        }

        private static IQueryable<Book> ApplyFilters(
            IQueryable<Book> q, string? search, string? author, string? genre, bool? availableOnly)
        {
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                q = q.Where(b =>
                    (b.Title  != null && b.Title.Contains(s)) ||
                    (b.Author != null && b.Author.Contains(s)) ||
                    (b.Isbn   != null && b.Isbn.Contains(s)));
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

            return q;
        }

        private static IQueryable<Book> ApplySorting(
            IQueryable<Book> q, string? sortBy, string? sortDir)
        {
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            return (sortBy?.ToLower()) switch
            {
                "title"       => desc ? q.OrderByDescending(b => b.Title)       : q.OrderBy(b => b.Title),
                "author"      => desc ? q.OrderByDescending(b => b.Author)      : q.OrderBy(b => b.Author),
                "genre"       => desc ? q.OrderByDescending(b => b.Genre)       : q.OrderBy(b => b.Genre),
                "publishedon" => desc ? q.OrderByDescending(b => b.PublishedOn) : q.OrderBy(b => b.PublishedOn),
                "copies"      => desc ? q.OrderByDescending(b => b.CopiesTotal) : q.OrderBy(b => b.CopiesTotal),
                _             => desc ? q.OrderByDescending(b => b.Id)          : q.OrderBy(b => b.Id),
            };
        }

        private static IQueryable<Book> ApplyPaging(IQueryable<Book> q, int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 100) pageSize = 10;

            return q.Skip((page - 1) * pageSize).Take(pageSize);
        }


        [HttpGet("{id:int}")]
        public async Task<ActionResult<Book>> GetById(int id)
        {
            var book = await _db.Books.FindAsync(id);
            return book is null ? NotFound() : book;
        }

        [Authorize(Policy = "CanManageBooks")]  
        [HttpPost]
        public async Task<ActionResult<Book>> Create(Book book)
        {
            NormalizeBook(book);
            ClampAvailability(book);

            _db.Books.Add(book);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
        }
        [Authorize(Policy = "CanManageBooks")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, Book updated)
        {
            if (id != updated.Id) return BadRequest("Route id и Body id не съвпадат.");

            var exists = await _db.Books.AsNoTracking().AnyAsync(b => b.Id == id);
            if (!exists) return NotFound();

            NormalizeBook(updated);
            ClampAvailability(updated);

            _db.Entry(updated).State = EntityState.Modified;
            await _db.SaveChangesAsync();
            return NoContent();
        }
        [Authorize(Policy = "CanManageBooks")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var book = await _db.Books.FindAsync(id);
            if (book is null) return NotFound();

            _db.Books.Remove(book);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private static void NormalizeBook(Book b)
        {
            b.Title  = b.Title?.Trim() ?? "";
            b.Author = string.IsNullOrWhiteSpace(b.Author) ? null : b.Author!.Trim();
            b.Genre  = string.IsNullOrWhiteSpace(b.Genre)  ? null : b.Genre!.Trim();
        }

        private static void ClampAvailability(Book b)
        {
            if (b.CopiesAvailable < 0) b.CopiesAvailable = 0;
            if (b.CopiesAvailable > b.CopiesTotal) b.CopiesAvailable = b.CopiesTotal;
        }
    }

    public record PagedResult<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);
}
