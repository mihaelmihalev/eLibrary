using System.ComponentModel.DataAnnotations;

namespace eLibrary.Api.DTOs
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Потребителското име е задължително.")]
        [MinLength(3, ErrorMessage = "Потребителското име трябва да е поне 3 символа.")]
        [MaxLength(50, ErrorMessage = "Потребителското име е твърде дълго.")]
        public string UserName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Имейлът е задължителен.")]
        [EmailAddress(ErrorMessage = "Невалиден имейл формат.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Паролата е задължителна.")]
        [MinLength(6, ErrorMessage = "Паролата трябва да е поне 6 символа.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Телефонът е задължителен.")]
        public string PhoneNumber { get; set; } = string.Empty;
    }
}
