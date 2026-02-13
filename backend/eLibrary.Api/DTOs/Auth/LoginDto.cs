using System.ComponentModel.DataAnnotations;

namespace eLibrary.Api.DTOs.Auth;

public sealed class LoginDto
{
    [Required(ErrorMessage = "Имейлът е задължителен.")]
    [EmailAddress(ErrorMessage = "Невалиден имейл формат.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Паролата е задължителна.")]
    public string Password { get; set; } = string.Empty;
}
