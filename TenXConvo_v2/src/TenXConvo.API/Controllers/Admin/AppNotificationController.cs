using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Hubs;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/notifications/app")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class AppNotificationController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ChatHub> _hub;

        public AppNotificationController(AppDbContext db, IHubContext<ChatHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.AppNotifications.AsQueryable();
            if (!string.IsNullOrWhiteSpace(type)) q = q.Where(n => n.Type == type);
            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(n => n.CreatedOn)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(n => new
                {
                    n.Id, n.Title, n.Message, n.Type, n.Sender, n.CreatedOn,
                    TargetCount = n.Targets.Count,
                    ReadCount   = n.Targets.Count(t => t.IsRead),
                })
                .ToListAsync();
            return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var n = await _db.AppNotifications
                .Include(n => n.Targets).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(n => n.Id == id);
            if (n == null) return NotFound(new { success = false, message = "Not found." });
            return Ok(new
            {
                success = true,
                data = new
                {
                    n.Id, n.Title, n.Message, n.Type, n.Sender, n.CreatedOn,
                    targets = n.Targets.Select(t => new
                    {
                        t.UserId, t.User.UserName, t.IsRead, t.ReadAt,
                        ImageUrl = t.User.ImageUrl,
                    })
                }
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAppNotificationRequest req)
        {
            var senderName = User.FindFirst("name")?.Value
                          ?? User.FindFirst("sub")?.Value
                          ?? "Admin";

            // Resolve target users
            List<AppUser> targets;
            if (req.SendToAll)
            {
                targets = await _db.Users.Where(u => u.IsActive).ToListAsync();
            }
            else if (req.TargetUserIds?.Any() == true)
            {
                targets = await _db.Users.Where(u => req.TargetUserIds.Contains(u.Id) && u.IsActive).ToListAsync();
            }
            else if (!string.IsNullOrEmpty(req.TargetRoleName))
            {
                targets = await _db.Users
                    .Include(u => u.Role)
                    .Where(u => u.IsActive && u.Role != null && u.Role.RoleName == req.TargetRoleName)
                    .ToListAsync();
            }
            else
            {
                return BadRequest(new { success = false, message = "Specify sendToAll, targetUserIds, or targetRoleName." });
            }

            if (targets.Count == 0)
                return BadRequest(new { success = false, message = "No active users matched the target criteria." });

            // Create AppNotification
            var notif = new AppNotification
            {
                Id        = Guid.NewGuid(),
                Title     = req.Title,
                Message   = req.Message,
                Type      = req.Type ?? "General",
                Sender    = senderName,
                SentBy    = User.FindFirst("sub")?.Value,
                CreatedOn = DateTime.UtcNow,
            };

            // Create WebNotification for each target + AppNotificationTarget entry
            var webNotifs = new List<WebNotification>();
            foreach (var user in targets)
            {
                notif.Targets.Add(new AppNotificationTarget
                {
                    Id             = Guid.NewGuid(),
                    NotificationId = notif.Id,
                    UserId         = user.Id,
                    IsRead         = false,
                });

                webNotifs.Add(new WebNotification
                {
                    Id        = Guid.NewGuid(),
                    UserId    = user.Id,
                    Title     = req.Title,
                    Body      = req.Message,
                    Url       = req.Url,
                    IsRead    = false,
                    CreatedOn = DateTime.UtcNow,
                });
            }

            _db.AppNotifications.Add(notif);
            _db.WebNotifications.AddRange(webNotifs);
            await _db.SaveChangesAsync();

            // Broadcast via SignalR to all connected users
            await _hub.Clients.All.SendAsync("NewAppNotification", new
            {
                notif.Id, notif.Title, notif.Message, notif.Type, notif.CreatedOn,
            });

            return Ok(new
            {
                success = true,
                message = $"Notification sent to {targets.Count} user(s).",
                data    = new { notif.Id, targetCount = targets.Count }
            });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var n = await _db.AppNotifications.Include(n => n.Targets).FirstOrDefaultAsync(n => n.Id == id);
            if (n == null) return NotFound(new { success = false, message = "Not found." });
            _db.AppNotificationTargets.RemoveRange(n.Targets);
            _db.AppNotifications.Remove(n);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Notification deleted." });
        }
    }

    public record CreateAppNotificationRequest(
        string Title,
        string Message,
        string? Type,
        string? Url,
        bool    SendToAll = false,
        List<Guid>? TargetUserIds = null,
        string? TargetRoleName = null
    );
}
