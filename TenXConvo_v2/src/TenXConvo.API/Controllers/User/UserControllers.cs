using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using TenXConvo.API.Helpers;
using TenXConvo.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;
using TenXConvo.API.Hubs;

namespace TenXConvo.API.Controllers.User;

[ApiController]
[Route("api/user/consultants")]
[EnableCors("UserPortal")]
public class UserConsultantsController : ControllerBase
{
    private readonly IUserService _svc;
    public UserConsultantsController(IUserService svc) => _svc = svc;
    private Guid UserId => AuthHelper.GetUserId(User);

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 12, [FromQuery] string? search = null)
        => Ok(new { success = true, data = await _svc.GetConsultantsAsync(page, pageSize, search) });

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            return Ok(new { success = true, data = await _svc.GetConsultantByIdAsync(id) });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    /// Public profile by slug — e.g. GET /api/user/consultants/by-slug/ali-khan
    [HttpGet("by-slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        try
        {
            return Ok(new { success = true, data = await _svc.GetConsultantBySlugAsync(slug) });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/connect")]
    [Authorize(Policy = "ClientOnly")]
    public async Task<IActionResult> Connect(Guid id)
    {
        try
        {
            return Ok(new { success = true, data = await _svc.ConnectAsync(UserId, id) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}


[ApiController]
[Route("api/user/profile")]
[Authorize(Policy = "ClientOnly")]
[EnableCors("UserPortal")]
public class CustomerProfileController : ControllerBase
{
    private readonly IUserService _svc;
    public CustomerProfileController(IUserService svc) => _svc = svc;
    private Guid UserId => AuthHelper.GetUserId(User);

    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(new { success = true, data = await _svc.GetMyProfileAsync(UserId) });

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] CustomerProfileInput req)
        => Ok(new { success = true, data = await _svc.UpdateProfileAsync(UserId, req) });
}



[ApiController]
[Route("api/user/messages")]
[Authorize(Policy = "ClientOnly")]
[EnableCors("UserPortal")]
public class UserMessagingController : ControllerBase
{
    private readonly IUserService _svc;
    private readonly IHubContext<ChatHub> _hub;
    public UserMessagingController(IUserService svc, IHubContext<ChatHub> hub)
    {
        _svc = svc;
        _hub = hub;
    }
    private Guid UserId => AuthHelper.GetUserId(User);

    // NEW ENDPOINT — DIRECT CHAT START
    [HttpPost("start/{consultantUserId:guid}")]
    public async Task<IActionResult> StartConversation(Guid consultantUserId)
    {
        try
        {
            var conversationId = await _svc.StartDirectChatAsync(UserId, consultantUserId);

            return Ok(new
            {
                success = true,
                data = new
                {
                    conversationId = conversationId
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(new { success = true, data = await _svc.GetConversationsAsync(UserId, page, pageSize) });

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        => Ok(new { success = true, data = await _svc.GetMessagesAsync(id, UserId, page, pageSize) });

    [HttpPost("{id:guid}")]
    public async Task<IActionResult> Send(Guid id, [FromBody] UserSendMessageRequest req) 
    {
        var result = await _svc.SendMessageAsync(id, UserId, req.Body, req.MessageType ?? "text", req.AttachmentUrl, req.ReplyToId);
        
        // Broadcast via SignalR
        var user = await _svc.GetMyProfileAsync(UserId);
        await _hub.Clients.Group($"room_{id}").SendAsync("ReceiveMessage", new {
            messageId = result.MessageId,
            conversationId = id,
            senderId = UserId,
            senderName = user.UserName,
            body = result.Body,
            messageType = result.MessageType,
            attachmentUrl = result.AttachmentUrl,
            sentAt = result.SentAt,
            isRead = false,
            replyToId = result.ReplyToId,
            replyToBody = result.ReplyToBody
        });

        return Ok(new { success = true, data = result });
    }

    [HttpPost("{id:guid}/upload")]
    public async Task<IActionResult> Upload(Guid id, [FromForm] IFormFile file)
    {
        using var stream = file.OpenReadStream();
        var url = await _svc.UploadAvatarAsync(UserId, stream, file.FileName);
        return Ok(new { success = true, data = new { url } });
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id)
    {
        await _svc.MarkConversationReadAsync(id, UserId);
        return Ok(new { success = true });
    }
}

public record UserSendMessageRequest(string Body, string? MessageType, string? AttachmentUrl = null, Guid? ReplyToId = null);