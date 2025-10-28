using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using eLibrary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using eLibrary.Api.DTOs;
using eLibrary.Api.DTOs.Auth;

namespace eLibrary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _users;
    private readonly SignInManager<User> _signIn;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly IConfiguration _cfg;

    public AuthController(UserManager<User> users, SignInManager<User> signIn, RoleManager<IdentityRole> roles, IConfiguration cfg)
    {
        _users = users; _signIn = signIn; _roles = roles; _cfg = cfg;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto req)
    {
        if (string.IsNullOrWhiteSpace(req.UserName))
            return BadRequest(new[] { "Потребителското име е задължително." });

        var user = new User
        {
            UserName = req.UserName,
            Email = req.Email,
            PhoneNumber = string.IsNullOrWhiteSpace(req.PhoneNumber) ? null : req.PhoneNumber
        };

        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => new { code = e.Code, description = e.Description }));

        await _users.AddToRoleAsync(user, "Member");

        return Ok();
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenDto>> Login(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null) return Unauthorized();

        var check = await _signIn.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!check.Succeeded) return Unauthorized();

        var roles = await _users.GetRolesAsync(user);
        var token = CreateAccessToken(user, roles);
        return new TokenDto(token);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeDto>> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var u = await _users.FindByIdAsync(id);
        if (u is null) return Unauthorized();

        var rs = await _users.GetRolesAsync(u);

        var userName = u.UserName ?? u.Email ?? id;

        return Ok(new MeDto(
            u.Id,
            u.Email ?? string.Empty,
            userName,
            rs.ToList()
        ));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return NoContent();
    }

    private string CreateAccessToken(User user, IList<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var issuer = _cfg["Jwt:Issuer"];
        var minutes = int.TryParse(_cfg["Jwt:AccessMinutes"], out var m) ? m : 60;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? user.Email!),
            new(ClaimTypes.Email, user.Email!)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: null,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
