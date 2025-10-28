using System.Collections.Generic;

namespace eLibrary.Api.DTOs.Auth
{
    public sealed record MeDto(
        string Id,
        string Email,
        string UserName,
        IList<string> Roles
    );
}
