using System.Security.Claims;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Middleware;

public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;

    public AuditLoggingMiddleware(RequestDelegate next, ILogger<AuditLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var request = context.Request;

        // Only log state-changing requests
        if (request.Method is "POST" or "PUT" or "DELETE" or "PATCH")
        {
            var path = request.Path.Value ?? "";

            // Skip logging audit/error endpoints and health checks
            if (path.Contains("/audit-logs") || path.Contains("/error-logs") || path.Contains("/health"))
            {
                await _next(context);
                return;
            }

            await _next(context);

            // Log AFTER the request completes
            try
            {
                var user = context.User;
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
                var userName = user.Identity?.Name ?? user.FindFirstValue("preferred_username") ?? "Anonymous";

                var audit = new AuditLog
                {
                    UserId = userId,
                    UserName = userName,
                    Action = request.Method,
                    Entity = path,
                    EntityId = context.Response.StatusCode.ToString(),
                    Details = $"Query: {request.QueryString}",
                    IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    CreatedOn = DateTime.UtcNow
                };

                db.AuditLogs.Add(audit);
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Don't let audit logging failures crash the request pipeline
                _logger.LogWarning(ex, "Audit logging failed for {Path}", path);
            }
        }
        else
        {
            await _next(context);
        }
    }
}
