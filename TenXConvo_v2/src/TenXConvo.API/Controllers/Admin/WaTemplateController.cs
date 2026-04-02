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
    [Route("api/admin/notifications/templates/wa")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class WaTemplateController : ControllerBase
    {
        private readonly AppDbContext _db;
        public WaTemplateController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? status,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.WaTemplates.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(t => t.TemplateName.Contains(search) || t.TemplateTitle.Contains(search));
            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(t => t.Status == status);

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
            var t = await _db.WaTemplates.FindAsync(id);
            if (t == null) return NotFound(new { success = false, message = "Template not found." });
            return Ok(new { success = true, data = t });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] WaTemplateRequest req)
        {
            var duplicate = await _db.WaTemplates.AnyAsync(t => t.TemplateName == req.TemplateName);
            if (duplicate) return BadRequest(new { success = false, message = "Template name already exists." });

            var item = new WaTemplate
            {
                Id            = Guid.NewGuid(),
                TemplateName  = req.TemplateName,
                TemplateTitle = req.TemplateTitle,
                Activity      = req.Activity,
                Body          = req.Body,
                Variables     = req.Variables,
                Status        = "active",
                CreatedOn     = DateTime.UtcNow,
            };
            _db.WaTemplates.Add(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] WaTemplateRequest req)
        {
            var item = await _db.WaTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });

            item.TemplateName  = req.TemplateName;
            item.TemplateTitle = req.TemplateTitle;
            item.Activity      = req.Activity;
            item.Body          = req.Body;
            item.Variables     = req.Variables;
            item.UpdatedAt     = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = item });
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest req)
        {
            var item = await _db.WaTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            item.Status    = req.Status;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Status set to {req.Status}." });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await _db.WaTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            _db.WaTemplates.Remove(item);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Deleted." });
        }

        // ── Preview: replace {{variables}} with sample values ────────────────────
        [HttpPost("{id:guid}/preview")]
        public async Task<IActionResult> Preview(Guid id, [FromBody] Dictionary<string, string> vars)
        {
            var item = await _db.WaTemplates.FindAsync(id);
            if (item == null) return NotFound(new { success = false, message = "Not found." });
            var preview = item.Body;
            foreach (var (k, v) in vars)
                preview = preview.Replace($"{{{{{k}}}}}", v);
            return Ok(new { success = true, data = new { preview, original = item.Body } });
        }
    }

    public record WaTemplateRequest(string TemplateName, string TemplateTitle, string? Activity, string Body, string? Variables);
}
