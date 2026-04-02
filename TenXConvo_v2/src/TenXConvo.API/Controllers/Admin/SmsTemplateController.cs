using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;
using TenXConvo.API.Models.Admin;

namespace TenXConvo.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/notifications/templates/sms")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class SmsTemplateController : ControllerBase
    {
        private readonly AppDbContext _db;
        public SmsTemplateController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.SmsTemplates.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search)) q = q.Where(t => t.TemplateName.Contains(search));
            if (!string.IsNullOrWhiteSpace(status))  q = q.Where(t => t.Status == status);
            var total = await q.CountAsync();
            var items = await q.OrderByDescending(t => t.CreatedOn)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(t => new { t.Id, t.TemplateName, t.TemplateTitle, t.Activity, t.Status, t.CreatedOn })
                .ToListAsync();
            return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var t = await _db.SmsTemplates.FindAsync(id);
            if (t == null) return NotFound(new { success = false, message = "Not found." });
            return Ok(new { success = true, data = t });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SmsTemplateRequest req)
        {
            var item = new SmsTemplate
            {
                Id = Guid.NewGuid(),
                TemplateName = req.TemplateName,
                TemplateTitle = req.TemplateTitle,
                Activity = req.Activity,
                Body = req.Body,
                Status = "active",
                CreatedOn = DateTime.UtcNow,
            };
            _db.SmsTemplates.Add(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] SmsTemplateRequest req)
        {
            var item = await _db.SmsTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            item.TemplateName = req.TemplateName;
            item.TemplateTitle = req.TemplateTitle;
            item.Activity = req.Activity;
            item.Body = req.Body;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest req)
        {
            var item = await _db.SmsTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            item.Status = req.Status;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Status set to {req.Status}." });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await _db.SmsTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            _db.SmsTemplates.Remove(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Deleted." });
        }

        [HttpPost("char-count")]
        public IActionResult CharCount([FromBody] SmsCharCountRequest req)
        {
            var len = req.Message.Length;
            var smsCount = (int)Math.Ceiling(len / 160.0);
            return Ok(new { success = true, data = new { length = len, smsCount, remaining = (smsCount * 160) - len } });
        }
    }

    public record SmsTemplateRequest(string TemplateName, string TemplateTitle, string? Activity, string Body);
    public record SmsCharCountRequest(string Message);
}
