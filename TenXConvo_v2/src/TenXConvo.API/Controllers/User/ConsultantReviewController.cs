using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.API.Helpers;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.User
{
    [ApiController]
    [Route("api/user/consultants/{consultantUserId:guid}/reviews")]
    [EnableCors("UserPortal")]
    public class ConsultantReviewController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ConsultantReviewController(AppDbContext db) => _db = db;

        private Guid? MyUserId
        {
            get
            {
                try { return AuthHelper.GetUserId(User); }
                catch { return null; }
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(Guid consultantUserId,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var profile = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == consultantUserId);
            if (profile == null) return NotFound(new { success = false, message = "Consultant not found." });

            var q     = _db.ConsultantReviews.Include(r => r.Customer).ThenInclude(c => c.User)
                           .Where(r => r.ConsultantId == profile.Id);
            var total = await q.CountAsync();
            var avg   = total > 0 ? await q.AverageAsync(r => (double)r.Rating) : 0.0;

            var items = await q.OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new
                {
                    r.Id, r.Rating, r.Comment, r.CreatedAt,
                    ReviewerName = r.Customer.User.UserName,
                    ReviewerAvatar = r.Customer.AvatarUrl,
                    IsMyReview = r.Customer.UserId == (MyUserId ?? Guid.Empty)
                })
                .ToListAsync();

            var ratingBreakdown = await _db.ConsultantReviews
                .Where(r => r.ConsultantId == profile.Id)
                .GroupBy(r => r.Rating)
                .Select(g => new { Stars = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    items, totalRecords = total, page, pageSize,
                    averageRating = Math.Round(avg, 1),
                    ratingBreakdown,
                }
            });
        }

        [HttpPost]
        [Authorize(Policy = "ClientOnly")]
        public async Task<IActionResult> Create(Guid consultantUserId, [FromBody] CreateReviewRequest req)
        {
            if (req.Rating is < 1 or > 5)
                return BadRequest(new { success = false, message = "Rating must be 1–5." });

            var consultant = await _db.ConsultantProfiles.FirstOrDefaultAsync(p => p.UserId == consultantUserId);
            if (consultant == null) return NotFound(new { success = false, message = "Consultant not found." });

            var myProfile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId!.Value);
            if (myProfile == null) return BadRequest(new { success = false, message = "Customer profile not found." });

            // Must have an accepted connection to leave a review
            var hasConnection = await _db.ClientConnections.AnyAsync(c =>
                c.ConsultantId == consultant.Id &&
                c.CustomerId   == myProfile.Id  &&
                c.Status       == "accepted");

            if (!hasConnection)
                return BadRequest(new { success = false, message = "You can only review consultants you are connected with." });

            // One review per customer per consultant
            var alreadyReviewed = await _db.ConsultantReviews.AnyAsync(r =>
                r.ConsultantId == consultant.Id && r.CustomerId == myProfile.Id);
            if (alreadyReviewed)
                return BadRequest(new { success = false, message = "You have already reviewed this consultant. Use edit to update." });

            var review = new ConsultantReview
            {
                Id           = Guid.NewGuid(),
                ConsultantId = consultant.Id,
                CustomerId   = myProfile.Id,
                Rating       = req.Rating,
                Comment      = req.Comment,
                CreatedAt    = DateTime.UtcNow,
            };
            _db.ConsultantReviews.Add(review);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Review submitted.", data = new { review.Id } });
        }

        [HttpPut("{reviewId:guid}")]
        [Authorize(Policy = "ClientOnly")]
        public async Task<IActionResult> Update(Guid consultantUserId, Guid reviewId, [FromBody] CreateReviewRequest req)
        {
            if (req.Rating is < 1 or > 5)
                return BadRequest(new { success = false, message = "Rating must be 1–5." });

            var myProfile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId!.Value);
            if (myProfile == null) return BadRequest(new { success = false, message = "Profile not found." });

            var review = await _db.ConsultantReviews.FirstOrDefaultAsync(r =>
                r.Id == reviewId && r.CustomerId == myProfile.Id);
            if (review == null) return NotFound(new { success = false, message = "Review not found or not yours." });

            review.Rating    = req.Rating;
            review.Comment   = req.Comment;
            review.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Review updated." });
        }

        [HttpDelete("{reviewId:guid}")]
        [Authorize(Policy = "ClientOnly")]
        public async Task<IActionResult> Delete(Guid consultantUserId, Guid reviewId)
        {
            var myProfile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == MyUserId!.Value);
            if (myProfile == null) return BadRequest(new { success = false, message = "Profile not found." });

            var review = await _db.ConsultantReviews.FirstOrDefaultAsync(r =>
                r.Id == reviewId && r.CustomerId == myProfile.Id);
            if (review == null) return NotFound(new { success = false, message = "Review not found or not yours." });

            _db.ConsultantReviews.Remove(review);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Review deleted." });
        }
    }

    public record CreateReviewRequest(int Rating, string? Comment);
}

namespace TenXConvo.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/data/reviews")]
    [Authorize(Policy = "AdminOnly")]
    [EnableCors("AdminPortal")]
    public class AdminReviewController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminReviewController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? minRating, [FromQuery] int? maxRating,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var q = _db.ConsultantReviews
                .Include(r => r.Consultant).ThenInclude(c => c.User)
                .Include(r => r.Customer).ThenInclude(c => c.User)
                .AsQueryable();

            if (minRating.HasValue) q = q.Where(r => r.Rating >= minRating.Value);
            if (maxRating.HasValue) q = q.Where(r => r.Rating <= maxRating.Value);

            var total = await q.CountAsync();
            var items = await q.OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new
                {
                    r.Id, r.Rating, r.Comment, r.CreatedAt,
                    ConsultantName = r.Consultant.User.UserName,
                    ReviewerName   = r.Customer.User.UserName,
                })
                .ToListAsync();

            return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var r = await _db.ConsultantReviews.FindAsync(id);
            if (r == null) return NotFound(new { success = false, message = "Not found." });
            _db.ConsultantReviews.Remove(r);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Review removed." });
        }
    }
}
