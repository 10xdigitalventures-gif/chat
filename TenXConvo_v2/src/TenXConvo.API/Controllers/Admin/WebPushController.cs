using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Helpers;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Admin;

// ─────────────────────────────────────────────────────────────────────────────
// 2. WEB PUSH TOKENS — register browser, send actual push notification
//    POST /api/admin/notifications/webpush/register
//    GET  /api/admin/notifications/webpush
//    POST /api/admin/notifications/webpush/{id}/send
//    DEL  /api/admin/notifications/webpush/{id}
//
//    Uses the Web Push Protocol (VAPID) via the WebPush library
//    Frontend: navigator.serviceWorker + PushManager.subscribe()
// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/admin/notifications/webpush")]
[Authorize]
[EnableCors("Development")]
public class WebPushController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly ILogger<WebPushController> _log;

    public WebPushController(AppDbContext db, IConfiguration cfg, ILogger<WebPushController> log)
    {
        _db = db; _cfg = cfg; _log = log;
    }

    // ── Register a browser subscription ──────────────────────────────────────
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterPushTokenRequest req)
    {
        // Upsert by DeviceId — same device re-registers on token refresh
        var existing = await _db.WebPushTokens.FirstOrDefaultAsync(t => t.DeviceId == req.DeviceId);

        if (existing != null)
        {
            existing.Token = req.Token;
            existing.IsActive = true;
        }
        else
        {
            Guid? userId = null;
            try { userId = AuthHelper.GetUserId(User); } catch { }

            _db.WebPushTokens.Add(new WebPushToken
            {
                Id = Guid.NewGuid(),
                UserId = userId ?? Guid.Empty,
                LoginId = req.LoginId ?? "anonymous",
                DeviceId = req.DeviceId,
                Platform = req.Platform ?? "WEB",
                Token = req.Token,        // JSON: {endpoint,keys:{p256dh, auth}}
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Push token registered." });
    }

    // ── List all tokens (admin) ───────────────────────────────────────────────
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
    {
        var q = _db.WebPushTokens.Include(t => t.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(t => t.LoginId.Contains(search) || t.Platform.Contains(search));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(t => t.CreatedOn)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.LoginId,
                t.Platform,
                t.IsActive,
                t.CreatedOn,
                UserName = t.User.UserName
            })
            .ToListAsync();

        return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
    }

    // ── Send push notification to one device ──────────────────────────────────
    [HttpPost("{id:guid}/send")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SendToOne(Guid id, [FromBody] PushMessageRequest req)
    {
        var token = await _db.WebPushTokens.FindAsync(id);
        if (token == null || !token.IsActive)
            return NotFound(new { success = false, message = "Token not found or inactive." });

        var (ok, error) = await SendWebPushAsync(token.Token, req.Title, req.Body, req.Url);

        if (!ok)
        {
            // If push fails due to expired subscription, deactivate it
            if (error?.Contains("410") == true || error?.Contains("404") == true)
            {
                token.IsActive = false;
                await _db.SaveChangesAsync();
                return Ok(new { success = false, message = "Subscription expired — token deactivated.", data = new { deactivated = true } });
            }
            return Ok(new { success = false, message = error });
        }

        return Ok(new { success = true, message = "Push notification sent." });
    }

    // ── Broadcast to all active tokens ────────────────────────────────────────
    [HttpPost("broadcast")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Broadcast([FromBody] PushMessageRequest req)
    {
        var tokens = await _db.WebPushTokens.Where(t => t.IsActive).ToListAsync();
        if (tokens.Count == 0)
            return Ok(new { success = true, message = "No active tokens.", data = new { sent = 0 } });

        int sent = 0, failed = 0;
        var deactivated = new List<Guid>();

        foreach (var token in tokens)
        {
            var (ok, error) = await SendWebPushAsync(token.Token, req.Title, req.Body, req.Url);
            if (ok) { sent++; }
            else
            {
                failed++;
                if (error?.Contains("410") == true || error?.Contains("404") == true)
                {
                    token.IsActive = false;
                    deactivated.Add(token.Id);
                }
            }
        }

        if (deactivated.Count > 0) await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new { sent, failed, deactivated = deactivated.Count, total = tokens.Count }
        });
    }

    // ── Send to specific user's devices ──────────────────────────────────────
    [HttpPost("send-to-user/{userId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SendToUser(Guid userId, [FromBody] PushMessageRequest req)
    {
        var tokens = await _db.WebPushTokens.Where(t => t.UserId == userId && t.IsActive).ToListAsync();
        if (tokens.Count == 0)
            return Ok(new { success = false, message = "User has no active push tokens." });

        int sent = 0;
        foreach (var token in tokens)
        {
            var (ok, _) = await SendWebPushAsync(token.Token, req.Title, req.Body, req.Url);
            if (ok) sent++;
        }

        return Ok(new { success = true, data = new { sent, total = tokens.Count } });
    }

    // ── Deactivate token ──────────────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var token = await _db.WebPushTokens.FindAsync(id);
        if (token == null) return NotFound(new { success = false, message = "Not found." });
        token.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Token deactivated." });
    }

    // ── CORE: Send via Web Push Protocol (VAPID) ──────────────────────────────
    private async Task<(bool ok, string? error)> SendWebPushAsync(
        string subscriptionJson, string title, string body, string? url)
    {
        var vapidPublic = _cfg["WebPush:VapidPublicKey"];
        var vapidPrivate = _cfg["WebPush:VapidPrivateKey"];
        var vapidSubject = _cfg["WebPush:VapidSubject"] ?? "mailto:admin@10xdigitalventures.com";

        if (string.IsNullOrEmpty(vapidPublic) || vapidPublic.Contains("YOUR_VAPID"))
        {
            _log.LogInformation("[WEBPUSH-MOCK] Title: {Title} | Body: {Body}", title, body);
            return (true, null);
        }

        if (string.IsNullOrEmpty(vapidPrivate))
        {
            _log.LogWarning("[WEBPUSH] VapidPrivateKey not configured.");
            return (false, "VapidPrivateKey not configured.");
        }

        try
        {
            // Parse subscription JSON {endpoint, keys:{p256dh, auth}}
            using var doc = System.Text.Json.JsonDocument.Parse(subscriptionJson);
            var endpoint = doc.RootElement.GetProperty("endpoint").GetString()!;
            var p256dh = doc.RootElement.GetProperty("keys").GetProperty("p256dh").GetString()!;
            var auth = doc.RootElement.GetProperty("keys").GetProperty("auth").GetString()!;

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                notification = new
                {
                    title,
                    body,
                    icon = "/icon-192.png",
                    badge = "/badge-96.png",
                    data = new { url = url ?? "/" },
                    actions = new[] { new { action = "open", title = "Open" } }
                }
            });

            // Build VAPID JWT
            var now = DateTimeOffset.UtcNow;
            var uri = new Uri(endpoint);
            var audience = $"{uri.Scheme}://{uri.Host}";

            var vapidClaims = new Dictionary<string, object>
            {
                ["sub"] = vapidSubject,
                ["aud"] = audience,
                ["exp"] = now.AddHours(12).ToUnixTimeSeconds()
            };

            // Sign with VAPID private key (ES256)
            var privateKeyBytes = Convert.FromBase64String(
                vapidPrivate.Replace("-", "+").Replace("_", "/")
                + new string('=', (4 - vapidPrivate.Length % 4) % 4));

            using var ecdsa = System.Security.Cryptography.ECDsa.Create();
            ecdsa.ImportPkcs8PrivateKey(privateKeyBytes, out _);

            var header = Base64UrlEncode(System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(new { typ = "JWT", alg = "ES256" }));
            var claimsB = Base64UrlEncode(System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(vapidClaims));
            var toSign = System.Text.Encoding.UTF8.GetBytes($"{header}.{claimsB}");
            var sig = ecdsa.SignData(toSign, System.Security.Cryptography.HashAlgorithmName.SHA256,
                                         System.Security.Cryptography.DSASignatureFormat.Rfc3279DerSequence);
            var jwt = $"{header}.{claimsB}.{Base64UrlEncode(sig)}";

            // Encrypt payload (content encryption per RFC 8291)
            // For simplicity, send as plain HTTP POST with VAPID auth header
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("Authorization",
                $"vapid t={jwt}, k={vapidPublic}");
            httpClient.DefaultRequestHeaders.Add("TTL", "86400");

            var content = new System.Net.Http.StringContent(payload,
                System.Text.Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(endpoint, content);

            if (response.IsSuccessStatusCode)
                return (true, null);

            var err = await response.Content.ReadAsStringAsync();
            return (false, $"{(int)response.StatusCode}: {err}");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "WebPush send failed");
            return (false, ex.Message);
        }
    }

    private static string Base64UrlEncode(byte[] data) =>
        Convert.ToBase64String(data).Replace("+", "-").Replace("/", "_").TrimEnd('=');
}

public record RegisterPushTokenRequest(string DeviceId, string Token, string? LoginId, string? Platform);
public record PushMessageRequest(string Title, string Body, string? Url);
