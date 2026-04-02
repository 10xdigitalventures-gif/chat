using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Helpers;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Consultant
{
    [ApiController]
    [Route("api/consultant/availability")]
    [Authorize(Policy = "ConsultantOnly")]
    [EnableCors("ConsultantPortal")]
    public class ConsultantAvailabilityController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ConsultantAvailabilityController(AppDbContext db) => _db = db;

        private Guid MyUserId => AuthHelper.GetUserId(User);

        [HttpGet]
        public async Task<IActionResult> GetMySchedule()
        {
            var profile = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId);
            if (profile == null) return NotFound(new { success = false, message = "Profile not found." });

            var slots = await _db.ConsultantAvailabilities
                .Where(a => a.ConsultantId == profile.Id)
                .OrderBy(a => a.DayOfWeek).ThenBy(a => a.StartTime)
                .Select(a => new
                {
                    a.Id,
                    DayOfWeek   = a.DayOfWeek.ToString(),
                    DayNumber   = (int)a.DayOfWeek,
                    StartTime   = a.StartTime.ToString("HH:mm"),
                    EndTime     = a.EndTime.ToString("HH:mm"),
                    a.IsAvailable,
                })
                .ToListAsync();

            var fullWeek = Enum.GetValues<DayOfWeek>().Select(day =>
            {
                var existing = slots.Where(s => s.DayNumber == (int)day).ToList();
                return new
                {
                    Day       = day.ToString(),
                    DayNumber = (int)day,
                    Slots     = existing,
                    IsWorkDay = existing.Any(s => s.IsAvailable),
                };
            });

            return Ok(new { success = true, data = fullWeek });
        }

        [HttpPut]
        public async Task<IActionResult> SaveSchedule([FromBody] List<AvailabilitySlotRequest> slots)
        {
            var profile = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId);
            if (profile == null) return NotFound(new { success = false, message = "Profile not found." });

            var grouped = slots.GroupBy(s => s.DayOfWeek);
            foreach (var dayGroup in grouped)
            {
                var ordered = dayGroup.OrderBy(s => s.StartTime).ToList();
                for (int i = 0; i < ordered.Count - 1; i++)
                {
                    if (TimeOnly.Parse(ordered[i].EndTime) > TimeOnly.Parse(ordered[i + 1].StartTime))
                        return BadRequest(new { success = false, message = $"Overlapping slots on {(DayOfWeek)dayGroup.Key}." });
                }
            }

            var existing = _db.ConsultantAvailabilities.Where(a => a.ConsultantId == profile.Id);
            _db.ConsultantAvailabilities.RemoveRange(existing);

            foreach (var slot in slots)
            {
                _db.ConsultantAvailabilities.Add(new ConsultantAvailability
                {
                    Id           = Guid.NewGuid(),
                    ConsultantId = profile.Id,
                    DayOfWeek    = (DayOfWeek)slot.DayOfWeek,
                    StartTime    = TimeOnly.Parse(slot.StartTime),
                    EndTime      = TimeOnly.Parse(slot.EndTime),
                    IsAvailable  = slot.IsAvailable,
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Schedule saved ({slots.Count} slots)." });
        }

        [HttpDelete]
        public async Task<IActionResult> ClearSchedule()
        {
            var profile = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId);
            if (profile == null) return NotFound(new { success = false, message = "Profile not found." });
            var slots = _db.ConsultantAvailabilities.Where(a => a.ConsultantId == profile.Id);
            _db.ConsultantAvailabilities.RemoveRange(slots);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Schedule cleared." });
        }
    }

    public record AvailabilitySlotRequest(int DayOfWeek, string StartTime, string EndTime, bool IsAvailable = true);
}

namespace TenXConvo.API.Controllers.User
{
    [ApiController]
    [Route("api/user/consultants/{consultantUserId:guid}/availability")]
    [EnableCors("UserPortal")]
    public class PublicAvailabilityController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PublicAvailabilityController(AppDbContext db) => _db = db;

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicSchedule(Guid consultantUserId)
        {
            var profile = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == consultantUserId && p.IsPublic);
            if (profile == null) return NotFound(new { success = false, message = "Consultant not found." });

            var slots = await _db.ConsultantAvailabilities
                .Where(a => a.ConsultantId == profile.Id && a.IsAvailable)
                .OrderBy(a => a.DayOfWeek).ThenBy(a => a.StartTime)
                .Select(a => new
                {
                    DayOfWeek = a.DayOfWeek.ToString(),
                    DayNumber = (int)a.DayOfWeek,
                    StartTime = a.StartTime.ToString("HH:mm"),
                    EndTime   = a.EndTime.ToString("HH:mm"),
                })
                .ToListAsync();

            return Ok(new { success = true, data = slots });
        }
    }
}
