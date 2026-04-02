using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/setup/fiscal-years")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class FiscalYearController : ControllerBase
    {
        private readonly AppDbContext _db;
        public FiscalYearController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _db.FiscalYears
                .OrderByDescending(f => f.StartDate)
                .Select(f => new
                {
                    f.Id, f.Name, f.StartDate, f.EndDate,
                    f.IsActive, f.IsCurrent, f.CreatedAt
                })
                .ToListAsync();
            return Ok(new { success = true, data = items });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FiscalYearRequest req)
        {
            if (req.EndDate <= req.StartDate)
                return BadRequest(new { success = false, message = "End date must be after start date." });

            var overlap = await _db.FiscalYears.AnyAsync(f =>
                f.StartDate < req.EndDate && f.EndDate > req.StartDate);
            if (overlap)
                return BadRequest(new { success = false, message = "Date range overlaps with an existing fiscal year." });

            var fy = new FiscalYear
            {
                Id        = Guid.NewGuid(),
                Name      = req.Name,
                StartDate = req.StartDate,
                EndDate   = req.EndDate,
                IsActive  = req.IsActive,
                IsCurrent = false,
                CreatedAt = DateTime.UtcNow,
            };
            _db.FiscalYears.Add(fy);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = fy });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] FiscalYearRequest req)
        {
            var fy = await _db.FiscalYears.FindAsync(id);
            if (fy == null) return NotFound(new { success = false, message = "Not found." });

            if (req.EndDate <= req.StartDate)
                return BadRequest(new { success = false, message = "End date must be after start date." });

            var overlap = await _db.FiscalYears.AnyAsync(f =>
                f.Id != id && f.StartDate < req.EndDate && f.EndDate > req.StartDate);
            if (overlap)
                return BadRequest(new { success = false, message = "Date range overlaps with another fiscal year." });

            fy.Name      = req.Name;
            fy.StartDate = req.StartDate;
            fy.EndDate   = req.EndDate;
            fy.IsActive  = req.IsActive;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, data = fy });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var fy = await _db.FiscalYears.FindAsync(id);
            if (fy == null) return NotFound(new { success = false, message = "Not found." });
            if (fy.IsCurrent)
                return BadRequest(new { success = false, message = "Cannot delete the current fiscal year." });
            _db.FiscalYears.Remove(fy);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Deleted." });
        }

        [HttpPut("{id:guid}/set-current")]
        public async Task<IActionResult> SetCurrent(Guid id)
        {
            var all = await _db.FiscalYears.ToListAsync();
            var target = all.FirstOrDefault(f => f.Id == id);
            if (target == null) return NotFound(new { success = false, message = "Not found." });

            all.ForEach(f => f.IsCurrent = false);
            target.IsCurrent = true;
            target.IsActive  = true;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"'{target.Name}' is now the current fiscal year." });
        }

        [HttpPatch("{id:guid}/toggle")]
        public async Task<IActionResult> Toggle(Guid id)
        {
            var fy = await _db.FiscalYears.FindAsync(id);
            if (fy == null) return NotFound(new { success = false, message = "Not found." });
            if (fy.IsCurrent && fy.IsActive)
                return BadRequest(new { success = false, message = "Cannot deactivate the current fiscal year." });
            fy.IsActive = !fy.IsActive;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Fiscal year {(fy.IsActive ? "activated" : "deactivated")}." });
        }
    }

    public record FiscalYearRequest(string Name, DateTime StartDate, DateTime EndDate, bool IsActive = true);
}
