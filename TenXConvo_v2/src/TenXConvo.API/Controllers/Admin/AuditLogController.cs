using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using TenXConvo.Application.Interfaces;

namespace TenXConvo.API.Controllers.Admin;

[ApiController][Route("api/admin/system/audit-logs")][Authorize(Policy="AdminOnly")][EnableCors("AdminPortal")]
public class AuditLogController : ControllerBase
{
    private readonly IAdminService _svc;
    public AuditLogController(IAdminService svc) => _svc = svc;

    [HttpGet] public async Task<IActionResult> GetAll([FromQuery] int page=1,[FromQuery] int pageSize=10,[FromQuery] string? search=null) => Ok(new { success=true, data = await _svc.GetAuditLogsAsync(page, pageSize, search) });
    [HttpGet("{id:guid}")] public async Task<IActionResult> GetById(Guid id) { try{return Ok(new{success=true,data=await _svc.GetAuditLogByIdAsync(id)});}catch(KeyNotFoundException ex){return NotFound(new{success=false,message=ex.Message});} }
}
