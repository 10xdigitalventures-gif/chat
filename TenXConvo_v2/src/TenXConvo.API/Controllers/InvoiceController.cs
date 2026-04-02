using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TenXConvo.API.Helpers;
using TenXConvo.Infrastructure.Services;

namespace TenXConvo.API.Controllers;

// ═══════════════════════════════════════════════════════════════════════════
//  INVOICES — Client views purchase history + downloads invoice PDF
// ═══════════════════════════════════════════════════════════════════════════

[ApiController][Route("api/invoices")][Authorize]
public class InvoiceController : ControllerBase
{
    private readonly InvoiceService _invoices;
    public InvoiceController(InvoiceService invoices) => _invoices = invoices;
    private Guid UserId => AuthHelper.GetUserId(User);

    /// <summary>List my invoices (purchase history)</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var items = await _invoices.GetUserInvoicesAsync(UserId, page, pageSize);
            var total = await _invoices.GetUserInvoiceCountAsync(UserId);
            return Ok(new { success = true, data = new { items, totalRecords = total, page, pageSize } });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    /// <summary>Download invoice as HTML page (client uses browser print → PDF)</summary>
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        try
        {
            var html = await _invoices.GenerateInvoiceHtmlAsync(id, UserId);
            return Content(html, "text/html");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }
}
