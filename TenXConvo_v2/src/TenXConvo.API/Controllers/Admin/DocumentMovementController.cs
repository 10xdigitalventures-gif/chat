using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.API.Controllers.Admin;

// ─────────────────────────────────────────────────────────────────────────────
// 3. DOCUMENT MOVEMENT — auto-number generation
//    GET  /api/admin/data/document-movements               → list
//    POST /api/admin/data/document-movements               → create
//    PUT  /api/admin/data/document-movements/{id}          → update
//    DEL  /api/admin/data/document-movements/{id}          → delete
//    POST /api/admin/data/document-movements/{id}/next     → get next number (CLTPTY-0001)
//    POST /api/admin/data/document-movements/generate      → generate by prefix code
// ─────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/admin/data/document-movements")]
[Authorize(Policy = "AdminOnly")]
[EnableCors("AdminPortal")]
public class DocumentMovementController : ControllerBase
{
    private readonly AppDbContext _db;
    // Prevent race conditions on number generation
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, object> _locks = new();

    public DocumentMovementController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search = null)
    {
        var q = _db.DocumentMovements.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(x => x.DocumentMovementName.Contains(search) || x.Prefix.Contains(search));

        var items = await q.OrderBy(x => x.Prefix).Select(x => new
        {
            x.Id,
            x.DocumentMovementName,
            x.Prefix,
            x.PrefixNo,
            x.CreatedOn,
            NextNumber = $"{x.Prefix}-{x.PrefixNo:D4}",
            TotalGenerated = x.PrefixNo - 1
        }).ToListAsync();

        return Ok(new { success = true, data = items });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _db.DocumentMovements.FindAsync(id);
        if (item == null) return NotFound(new { success = false, message = "Not found." });
        return Ok(new
        {
            success = true,
            data = new
            {
                item.Id,
                item.DocumentMovementName,
                item.Prefix,
                item.PrefixNo,
                NextNumber = $"{item.Prefix}-{item.PrefixNo:D4}"
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDocMovementRequest req)
    {
        // Validate prefix is unique
        var exists = await _db.DocumentMovements.AnyAsync(x => x.Prefix == req.Prefix.ToUpper());
        if (exists)
            return BadRequest(new { success = false, message = $"Prefix '{req.Prefix}' already exists." });

        var item = new DocumentMovement
        {
            Id = Guid.NewGuid(),
            DocumentMovementName = req.Name,
            Prefix = req.Prefix.ToUpper(),
            PrefixNo = req.StartFrom,
            CreatedOn = DateTime.UtcNow
        };
        _db.DocumentMovements.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                item.Id,
                item.DocumentMovementName,
                item.Prefix,
                item.PrefixNo,
                NextNumber = $"{item.Prefix}-{item.PrefixNo:D4}"
            }
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocMovementRequest req)
    {
        var item = await _db.DocumentMovements.FindAsync(id);
        if (item == null) return NotFound(new { success = false, message = "Not found." });

        item.DocumentMovementName = req.Name;
        // Only allow PrefixNo to go forward (never backwards — would duplicate numbers)
        if (req.ResetTo.HasValue && req.ResetTo.Value > item.PrefixNo)
            item.PrefixNo = req.ResetTo.Value;

        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = item });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await _db.DocumentMovements.FindAsync(id);
        if (item == null) return NotFound(new { success = false, message = "Not found." });
        _db.DocumentMovements.Remove(item);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted." });
    }

    // ── Generate next number — thread-safe ────────────────────────────────────
    /// <summary>
    /// Returns the next document number (e.g. CLTPTY-0001) and increments the counter.
    /// Thread-safe — uses per-prefix lock to prevent duplicate numbers under concurrent load.
    /// </summary>
    [HttpPost("{id:guid}/next")]
    public async Task<IActionResult> GetNext(Guid id)
    {
        var item = await _db.DocumentMovements.FindAsync(id);
        if (item == null) return NotFound(new { success = false, message = "Document movement not found." });

        return await GenerateNumber(item);
    }

    /// <summary>
    /// Generate by prefix code (e.g. POST body: { "prefix": "CLTPTY" })
    /// More convenient when you know the prefix but not the ID.
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateByPrefix([FromBody] GenerateByPrefixRequest req)
    {
        var item = await _db.DocumentMovements
            .FirstOrDefaultAsync(x => x.Prefix == req.Prefix.ToUpper());

        if (item == null)
            return NotFound(new { success = false, message = $"No document movement with prefix '{req.Prefix}'." });

        return await GenerateNumber(item);
    }

    // ── Core: atomic increment ────────────────────────────────────────────────
    private async Task<IActionResult> GenerateNumber(DocumentMovement item)
    {
        // Per-prefix lock prevents concurrent requests getting same number
        var lockObj = _locks.GetOrAdd(item.Prefix, _ => new object());

        string generatedNumber;
        lock (lockObj)
        {
            generatedNumber = $"{item.Prefix}-{item.PrefixNo:D4}";
            item.PrefixNo++;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                documentNumber = generatedNumber,
                prefix = item.Prefix,
                sequence = item.PrefixNo - 1,
                nextWillBe = $"{item.Prefix}-{item.PrefixNo:D4}"
            }
        });
    }
}

public record CreateDocMovementRequest(string Name, string Prefix, int StartFrom = 1);
public record UpdateDocMovementRequest(string Name, int? ResetTo);
public record GenerateByPrefixRequest(string Prefix);
