using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Controllers.Admin;
using TenXConvo.API.Helpers;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Auth;

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORGOT / RESET PASSWORD
//    POST /api/auth/forgot-password          → send OTP to email (AllowAnonymous)
//    POST /api/auth/verify-reset-token       → verify OTP is valid (AllowAnonymous)
//    POST /api/auth/reset-password           → apply new password (AllowAnonymous)
// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/auth")]
public class ForgotPasswordController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly NotificationDispatcher _notify;
    private readonly IConfiguration _cfg;

    public ForgotPasswordController(AppDbContext db, NotificationDispatcher notify, IConfiguration cfg)
    {
        _db = db; _notify = notify; _cfg = cfg;
    }

    // ── STEP 1: Request OTP ───────────────────────────────────────────────────
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        // Always return 200 even if email not found (prevent user enumeration)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user != null)
        {
            // Invalidate any previous unused tokens
            var oldTokens = await _db.PasswordResetTokens
                .Where(t => t.UserId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();
            oldTokens.ForEach(t => t.IsUsed = true);

            // Generate 6-digit OTP (cryptographically secure)
            var otp = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            _db.PasswordResetTokens.Add(new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                IsUsed = false,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            });

            await _db.SaveChangesAsync();

            // Send email
            var portalUrl = _cfg["PortalUrls:User"] ?? _cfg["ClientSettings:PortalUrl"] ?? "http://localhost:3004";
            var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#0ea5e9;margin-bottom:4px">Password Reset</h2>
              <p>Hi <strong>{user.UserName}</strong>,</p>
              <p>You requested a password reset for your 10X Convo account.</p>
              <p>Your one-time reset code is:</p>
              <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#0ea5e9;
                          background:#f0f9ff;border-radius:12px;padding:16px 24px;
                          text-align:center;margin:20px 0;border:2px dashed #bae6fd">
                {otp}
              </div>
              <p style="color:#64748b;font-size:13px">⏱ This code expires in <strong>15 minutes</strong>.</p>
              <p style="color:#64748b;font-size:13px">If you didn't request this, ignore this email — your password won't change.</p>
            </div>
            """;

            await _notify.SendEmailAsync(user.Email, $"Password Reset Code — 10X Convo", html);
        }

        // Always 200 (security: never reveal if email exists)
        return Ok(new
        {
            success = true,
            message = "If that email is registered, a reset code has been sent."
        });
    }

    // ── STEP 2: Verify OTP ────────────────────────────────────────────────────
    [HttpPost("verify-reset-token")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyResetToken([FromBody] VerifyResetTokenRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);
        if (user == null)
            return BadRequest(new { success = false, message = "Invalid or expired code." });

        var token = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id
                     && t.Token == req.Token
                     && !t.IsUsed
                     && t.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();

        if (token == null)
            return BadRequest(new { success = false, message = "Invalid or expired code. Please request a new one." });

        // Return a short-lived "verified" claim — client uses this to submit new password
        return Ok(new
        {
            success = true,
            message = "Code verified.",
            data = new { resetSessionToken = token.Id.ToString("N") }  // opaque session id
        });
    }

    // ── STEP 3: Apply new password ────────────────────────────────────────────
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordWithTokenRequest req)
    {
        // Validate password strength
        if (req.NewPassword.Length < 8)
            return BadRequest(new { success = false, message = "Password must be at least 8 characters." });
        if (!req.NewPassword.Any(char.IsUpper))
            return BadRequest(new { success = false, message = "Password must contain at least one uppercase letter." });
        if (!req.NewPassword.Any(char.IsDigit))
            return BadRequest(new { success = false, message = "Password must contain at least one digit." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);
        if (user == null)
            return BadRequest(new { success = false, message = "Invalid request." });

        // Validate session token (the Id returned from verify step)
        if (!Guid.TryParse(req.ResetSessionToken, out var sessionId))
            return BadRequest(new { success = false, message = "Invalid session." });

        var token = await _db.PasswordResetTokens
            .Where(t => t.Id == sessionId
                     && t.UserId == user.Id
                     && !t.IsUsed
                     && t.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();

        if (token == null)
            return BadRequest(new { success = false, message = "Session expired. Please start again." });

        // ── Apply password ────────────────────────────────────────────────────
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 11);
        user.UpdatedAt = DateTime.UtcNow;

        // Invalidate token + revoke all refresh tokens (force re-login on all devices)
        token.IsUsed = true;
        var allRefresh = await _db.RefreshTokens.Where(r => r.UserId == user.Id && !r.IsRevoked).ToListAsync();
        allRefresh.ForEach(r => r.IsRevoked = true);

        await _db.SaveChangesAsync();

        // Notify user via email
        var confirmHtml = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#10b981">Password Changed ✅</h2>
              <p>Hi <strong>{user.UserName}</strong>,</p>
              <p>Your 10X Convo password was successfully changed.</p>
              <p style="color:#ef4444;font-size:13px">If you didn't make this change, contact support immediately.</p>
            </div>
            """;
        await _notify.SendEmailAsync(user.Email, "Password Changed — 10X Convo", confirmHtml);

        return Ok(new { success = true, message = "Password reset successful. Please log in with your new password." });
    }
}

public record ForgotPasswordRequest(string Email);
public record VerifyResetTokenRequest(string Email, string Token);
public record ResetPasswordWithTokenRequest(string Email, string ResetSessionToken, string NewPassword);
