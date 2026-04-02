using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;
using TenXConvo.Infrastructure.Services;
using TenXConvo.API.Models.Admin;

namespace TenXConvo.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/notifications/templates/email")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class EmailTemplateController : ControllerBase
    {
        private readonly AppDbContext _db;
        public EmailTemplateController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.EmailTemplates.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search)) q = q.Where(t => t.TemplateName.Contains(search) || t.Subject.Contains(search));
            if (!string.IsNullOrWhiteSpace(status))  q = q.Where(t => t.Status == status);
            var total = await q.CountAsync();
            var items = await q.OrderByDescending(t => t.CreatedOn)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(t => new { t.Id, t.TemplateName, t.TemplateTitle, t.Subject, t.Activity, t.Status, t.CreatedOn })
                .ToListAsync();
            return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var t = await _db.EmailTemplates.FindAsync(id);
            if (t == null) return NotFound(new { success = false, message = "Not found." });
            return Ok(new { success = true, data = t });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmailTemplateRequest req)
        {
            var item = new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TemplateName = req.TemplateName,
                TemplateTitle = req.TemplateTitle,
                Activity = req.Activity,
                Subject = req.Subject,
                Body = req.Body,
                Status = "active",
                CreatedOn = DateTime.UtcNow,
            };
            _db.EmailTemplates.Add(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] EmailTemplateRequest req)
        {
            var item = await _db.EmailTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            item.TemplateName = req.TemplateName;
            item.TemplateTitle = req.TemplateTitle;
            item.Activity = req.Activity;
            item.Subject = req.Subject;
            item.Body = req.Body;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest req)
        {
            var item = await _db.EmailTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            item.Status = req.Status;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Status set to {req.Status}." });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await _db.EmailTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            _db.EmailTemplates.Remove(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Deleted." });
        }

        [HttpPost("{id:guid}/preview")]
        public async Task<IActionResult> Preview(Guid id, [FromBody] Dictionary<string, string> vars)
        {
            var item = await _db.EmailTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            var subject = item.Subject;
            var body    = item.Body;
            foreach (var (k, v) in vars)
            {
                subject = subject.Replace($"{{{{{k}}}}}", v);
                body    = body.Replace($"{{{{{k}}}}}", v);
            }
            return Ok(new { success = true, data = new { subject, body } });
        }

        [HttpPost("{id:guid}/send-test")]
        public async Task<IActionResult> SendTest(Guid id, [FromBody] SendTestEmailRequest req,
            [FromServices] NotificationDispatcher notify)
        {
            var item = await _db.EmailTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            var body = item.Body;
            foreach (var (k, v) in req.Variables ?? new())
                body = body.Replace($"{{{{{k}}}}}", v);
            var (ok, status) = await notify.SendEmailAsync(req.TestEmail, item.Subject, body);
            return Ok(new { success = ok, message = ok ? "Test email sent." : $"Failed: {status}" });
        }
    }

    public record EmailTemplateRequest(string TemplateName, string TemplateTitle, string? Activity, string Subject, string Body);
    public record SendTestEmailRequest(string TestEmail, Dictionary<string, string>? Variables);
}
