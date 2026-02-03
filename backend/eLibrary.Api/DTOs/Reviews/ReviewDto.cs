namespace eLibrary.Api.DTOs.Reviews;
public record ReviewDto(
    int Id,
    int BookId,
    string UserId,
    string UserName,
    int Rating,
    string Comment,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
