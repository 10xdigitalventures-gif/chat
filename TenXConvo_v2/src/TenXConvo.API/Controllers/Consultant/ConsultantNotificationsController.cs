using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Helpers;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Consultant
{
    [ApiController]
    [Route("api/consultant/notifications")]
    [Authorize(Policy = "ConsultantOnly")]
    [EnableCors("ConsultantPortal")]
    public class ConsultantNotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ConsultantNotificationsController(AppDbContext db) => _db = db;

        private Guid MyUserId => AuthHelper.GetUserId(User);

        [HttpGet]
        public async Task<IActionResult> GetMine([FromQuery] bool unreadOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.WebNotifications.Where(n => n.UserId == MyUserId);
            if (unreadOnly) q = q.Where(n => !n.IsRead);
            var total       = await q.CountAsync();
            var unreadCount = await _db.WebNotifications.CountAsync(n => n.UserId == MyUserId && !n.IsRead);
            var items       = await q.OrderByDescending(n => n.CreatedOn)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return Ok(new { success = true, data = new { items, totalRecords = total, unreadCount } });
        }

        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id)
        {
            var n = await _db.WebNotifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == MyUserId);
            if (n == null) return NotFound(new { success = false, message = "Not found." });
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var unread = await _db.WebNotifications.Where(n => n.UserId == MyUserId && !n.IsRead).ToListAsync();
            unread.ForEach(n => { n.IsRead = true; n.ReadAt = DateTime.UtcNow; });
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"{unread.Count} marked as read." });
        }
    }
}
