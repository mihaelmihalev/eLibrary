using System.ComponentModel.DataAnnotations;

namespace eLibrary.Api.DTOs.Reviews;
public record CreateReviewDto(
    [Range(1, 5)] int Rating,
    [MaxLength(500)] string Comment
);
