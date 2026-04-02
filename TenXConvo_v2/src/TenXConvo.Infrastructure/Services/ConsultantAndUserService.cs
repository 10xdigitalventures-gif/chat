using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TenXConvo.Application.Interfaces;
using TenXConvo.Domain.Entities;
using TenXConvo.Infrastructure.Data;

namespace TenXConvo.Infrastructure.Services;

// ═══════════════════════════════════════════════════════════════════════════
//  CONSULTANT SERVICE
// ═══════════════════════════════════════════════════════════════════════════
public class ConsultantService : IConsultantService
{
    private readonly AppDbContext _db;
    private readonly CreditService _credits;
    private readonly string _uploadsPath;
    private readonly string _baseUrl;

    public ConsultantService(AppDbContext db, IConfiguration config, CreditService credits)
    {
        _db = db;
        _credits = credits;
        _uploadsPath = config["FileStorage:LocalPath"] ?? "wwwroot/uploads";
        _baseUrl = config["FileStorage:BaseUrl"] ?? "http://localhost:5000/uploads";
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private async Task<ConsultantProfile> GetOrCreateConsultantProfile(Guid consultantUserId)
    {
        var cp = await _db.ConsultantProfiles
            .FirstOrDefaultAsync(x => x.UserId == consultantUserId);

        if (cp != null)
            return cp;

        cp = new ConsultantProfile
        {
            Id = Guid.NewGuid(),
            UserId = consultantUserId,
            Bio = "",
            Specialization = "",
            Experience = "",
            HourlyRate = 0,
            Timezone = "PKT",
            IsPublic = true,
            IsOnline = false,
            JoinedDate = DateTime.UtcNow
        };

        _db.ConsultantProfiles.Add(cp);
        await _db.SaveChangesAsync();

        return cp;
    }

    private static ConsultantProfileResult MapProfile(ConsultantProfile p) =>
        new(
            p.UserId,
            p.User?.UserName ?? "",
            p.Bio,
            p.AvatarUrl,
            p.IsOnline,
            p.IsPublic,
            p.JoinedDate,
            p.Specialization,
            p.Experience,
            p.HourlyRate,
            p.Slug,
            string.IsNullOrWhiteSpace(p.Slug) ? null : $"/c/{p.Slug}"
        );

    // ── PROFILE ──────────────────────────────────────────────────────────────

    public async Task<ConsultantProfileResult> GetMyProfileAsync(Guid userId)
    {
        var p = await _db.ConsultantProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId)
            ?? throw new KeyNotFoundException("Consultant profile not found.");

        return MapProfile(p);
    }

    public async Task<ConsultantProfileResult> UpdateProfileAsync(Guid userId, ConsultantProfileInput input)
    {
        var p = await GetOrCreateConsultantProfile(userId);

        p.Bio = input.Bio;
        p.Specialization = input.Specialization;
        p.Experience = input.Experience;
        p.HourlyRate = input.HourlyRate;
        p.IsOnline = input.IsOnline;
        p.IsPublic = input.IsPublic;

        if (!string.IsNullOrWhiteSpace(input.Slug))
        {
            var slug = System.Text.RegularExpressions.Regex.Replace(
                input.Slug.Trim().ToLower(),
                @"[^a-z0-9\-]",
                "-"
            );

            slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-{2,}", "-").Trim('-');

            var slugTaken = await _db.ConsultantProfiles
                .AnyAsync(x => x.Slug == slug && x.Id != p.Id);

            if (slugTaken)
                throw new InvalidOperationException($"The slug '{slug}' is already taken. Choose another.");

            p.Slug = slug;
        }
        else if (string.IsNullOrWhiteSpace(p.Slug))
        {
            var user = await _db.Users.FindAsync(userId);

            var baseSlug = System.Text.RegularExpressions.Regex.Replace(
                (user?.UserName ?? "consultant").Trim().ToLower(),
                @"[^a-z0-9\-]",
                "-"
            );

            baseSlug = System.Text.RegularExpressions.Regex.Replace(baseSlug, @"-{2,}", "-").Trim('-');

            var slug = baseSlug;
            var counter = 1;

            while (await _db.ConsultantProfiles.AnyAsync(x => x.Slug == slug && x.Id != p.Id))
                slug = $"{baseSlug}-{counter++}";

            p.Slug = slug;
        }

        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetMyProfileAsync(userId);
    }

    public async Task<string> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName)
    {
        var ext = Path.GetExtension(fileName);
        var newName = $"{Guid.NewGuid()}{ext}";
        var folder = Path.Combine(_uploadsPath, "avatars");

        Directory.CreateDirectory(folder);

        var fullPath = Path.Combine(folder, newName);

        using (var fs = File.Create(fullPath))
        {
            await fileStream.CopyToAsync(fs);
        }

        var url = $"{_baseUrl}/avatars/{newName}";
        var p = await GetOrCreateConsultantProfile(userId);

        p.AvatarUrl = url;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return url;
    }

    public async Task SetOnlineStatusAsync(Guid userId, bool isOnline)
    {
        var p = await GetOrCreateConsultantProfile(userId);
        p.IsOnline = isOnline;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── CLIENTS ──────────────────────────────────────────────────────────────

    public async Task<PagedResult<ClientResult>> GetMyClientsAsync(Guid consultantUserId, int page, int pageSize, string? search)
    {
        var cp = await GetOrCreateConsultantProfile(consultantUserId);

        var q = _db.ClientConnections
            .Include(c => c.Customer)
                .ThenInclude(c => c.User)
            .Where(c => c.ConsultantId == cp.Id && c.Status == "accepted");

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Customer.User.UserName.Contains(search));

        var total = await q.CountAsync();

        var items = await q
            .OrderByDescending(c => c.AcceptedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ClientResult(
                c.Customer.UserId,
                c.Customer.User.UserName,
                c.Customer.User.Email,
                c.Customer.AvatarUrl,
                c.AcceptedAt ?? c.RequestedAt
            ))
            .ToListAsync();

        return new PagedResult<ClientResult>(items, total, page, pageSize);
    }

    public async Task<List<ConnectionRequestResult>> GetPendingRequestsAsync(Guid consultantUserId)
    {
        var cp = await GetOrCreateConsultantProfile(consultantUserId);

        return await _db.ClientConnections
            .Include(c => c.Customer)
                .ThenInclude(c => c.User)
            .Where(c => c.ConsultantId == cp.Id && c.Status == "pending")
            .OrderByDescending(c => c.RequestedAt)
            .Select(c => new ConnectionRequestResult(
                c.Id,
                c.Customer.UserId,
                c.Customer.User.UserName,
                c.Customer.User.Email,
                c.Customer.AvatarUrl,
                c.RequestedAt
            ))
            .ToListAsync();
    }

    public async Task AcceptRequestAsync(Guid connectionId, Guid consultantUserId)
    {
        var c = await _db.ClientConnections
            .Include(x => x.Consultant)
            .FirstOrDefaultAsync(x => x.Id == connectionId && x.Consultant.UserId == consultantUserId)
            ?? throw new KeyNotFoundException("Connection request not found.");

        c.Status = "accepted";
        c.AcceptedAt = DateTime.UtcNow;

        var conversationExists = await _db.Conversations
            .AnyAsync(x => x.ConsultantId == c.ConsultantId && x.CustomerId == c.CustomerId);

        if (!conversationExists)
        {
            _db.Conversations.Add(new Conversation
            {
                ConsultantId = c.ConsultantId,
                CustomerId = c.CustomerId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task RejectRequestAsync(Guid connectionId, Guid consultantUserId)
    {
        var c = await _db.ClientConnections
            .Include(x => x.Consultant)
            .FirstOrDefaultAsync(x => x.Id == connectionId && x.Consultant.UserId == consultantUserId)
            ?? throw new KeyNotFoundException("Connection request not found.");

        c.Status = "rejected";
        await _db.SaveChangesAsync();
    }

    // ── MESSAGING ────────────────────────────────────────────────────────────

    public async Task<PagedResult<ConversationResult>> GetConversationsAsync(Guid consultantUserId, int page, int pageSize)
    {
        var cp = await GetOrCreateConsultantProfile(consultantUserId);

        var q = _db.Conversations
            .Include(c => c.Customer)
                .ThenInclude(c => c.User)
            .Include(c => c.Messages)
            .Where(c => c.ConsultantId == cp.Id && c.IsActive);

        var total = await q.CountAsync();

        var results = await q
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(conv => new ConversationResult(
                conv.Id,
                conv.Customer.UserId,
                conv.Customer.User.UserName,
                conv.Customer.AvatarUrl,
                conv.Messages
                    .Where(m => m.DeletedAt == null)
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.Body)
                    .FirstOrDefault(),
                conv.LastMessageAt,
                conv.Messages.Count(m =>
                    !m.IsRead &&
                    m.SenderId != consultantUserId &&
                    m.DeletedAt == null)
            ))
            .ToListAsync();

        return new PagedResult<ConversationResult>(results, total, page, pageSize);
    }

    public async Task<PagedResult<MessageResult>> GetMessagesAsync(Guid conversationId, Guid requestingUserId, int page, int pageSize)
    {
        var total = await _db.Messages
            .CountAsync(m => m.ConversationId == conversationId && m.DeletedAt == null);

        var items = await _db.Messages
            .Include(m => m.Sender)
            .Include(m => m.ReplyTo)
            .Where(m => m.ConversationId == conversationId && m.DeletedAt == null)
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MessageResult(
                m.Id,
                m.SenderId,
                m.Sender.UserName,
                m.Body,
                m.MessageType,
                m.AttachmentUrl,
                m.IsRead,
                m.SentAt,
                m.ReplyToId,
                m.ReplyTo != null ? m.ReplyTo.Body : null
            ))
            .ToListAsync();

        return new PagedResult<MessageResult>(items, total, page, pageSize);
    }

    public async Task<MessageResult> SendMessageAsync(Guid conversationId, Guid senderUserId, string body, string messageType = "text", string? attachmentUrl = null, Guid? replyToId = null)
    {
        var conv = await _db.Conversations.FindAsync(conversationId)
            ?? throw new KeyNotFoundException("Conversation not found.");

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId = senderUserId,
            Body = body,
            MessageType = messageType,
            AttachmentUrl = attachmentUrl,
            SentAt = DateTime.UtcNow,
            ReplyToId = replyToId
        };

        _db.Messages.Add(msg);
        conv.LastMessageAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // ── CREDIT CHARGE — Only charge clients ─────────
        var fullConv = await _db.Conversations.Include(c => c.Customer).FirstOrDefaultAsync(c => c.Id == conversationId);
        if (fullConv != null && fullConv.Customer.UserId == senderUserId)
        {
            var charCount = messageType == "text" ? body?.Length ?? 0 : 0;
            // Charge after save so we have a real Message ID for the transaction record
            await _credits.ChargeForMessageAsync(senderUserId, msg.Id, messageType, charCount);
        }

        var sender = await _db.Users.FindAsync(senderUserId);

        return new MessageResult(
            msg.Id,
            msg.SenderId,
            sender?.UserName ?? "",
            msg.Body,
            msg.MessageType,
            msg.AttachmentUrl,
            msg.IsRead,
            msg.SentAt,
            msg.ReplyToId,
            msg.ReplyTo?.Body
        );
    }

    public async Task MarkConversationReadAsync(Guid conversationId, Guid userId)
    {
        var unread = await _db.Messages
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead)
            .ToListAsync();

        foreach (var m in unread)
        {
            m.IsRead = true;
            m.ReadAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  USER SERVICE
// ═══════════════════════════════════════════════════════════════════════════
public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly CreditService _credits;
    private readonly string _uploadsPath;
    private readonly string _baseUrl;

    public UserService(AppDbContext db, IConfiguration config, CreditService credits)
    {
        _db = db;
        _credits = credits;
        _uploadsPath = config["FileStorage:LocalPath"] ?? "wwwroot/uploads";
        _baseUrl = config["FileStorage:BaseUrl"] ?? "http://localhost:5000/uploads";
    }

    public async Task<PagedResult<ConsultantCardResult>> GetConsultantsAsync(int page, int pageSize, string? search)
    {
        var q = _db.ConsultantProfiles
            .Include(p => p.User)
            .Where(p => p.IsPublic)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            q = q.Where(p =>
                p.User.UserName.Contains(search) ||
                (p.Bio != null && p.Bio.Contains(search)) ||
                (p.Specialization != null && p.Specialization.Contains(search)));
        }

        var total = await q.CountAsync();

        var items = await q
            .OrderByDescending(p => p.JoinedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ConsultantCardResult(
                p.UserId,
                p.User.UserName,
                p.Bio,
                p.AvatarUrl,
                p.IsOnline,
                p.JoinedDate,
                p.Slug,
                p.Specialization,
                p.Experience,
                p.HourlyRate
            ))
            .ToListAsync();

        return new PagedResult<ConsultantCardResult>(items, total, page, pageSize);
    }

    public async Task<ConsultantCardResult> GetConsultantByIdAsync(Guid consultantUserId)
    {
        var p = await _db.ConsultantProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == consultantUserId && x.IsPublic)
            ?? throw new KeyNotFoundException("Consultant not found.");

        return new ConsultantCardResult(
            p.UserId,
            p.User.UserName,
            p.Bio,
            p.AvatarUrl,
            p.IsOnline,
            p.JoinedDate,
            p.Slug,
            p.Specialization,
            p.Experience,
            p.HourlyRate
        );
    }

    public async Task<ConsultantCardResult> GetConsultantBySlugAsync(string slug)
    {
        var p = await _db.ConsultantProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Slug == slug.ToLower() && x.IsPublic)
            ?? throw new KeyNotFoundException("Consultant not found.");

        return new ConsultantCardResult(
            p.UserId,
            p.User.UserName,
            p.Bio,
            p.AvatarUrl,
            p.IsOnline,
            p.JoinedDate,
            p.Slug,
            p.Specialization,
            p.Experience,
            p.HourlyRate
        );
    }

    public async Task<ConnectionResult> ConnectAsync(Guid customerUserId, Guid consultantUserId)
    {
        var cp = await _db.ConsultantProfiles
            .FirstOrDefaultAsync(x => x.UserId == consultantUserId)
            ?? throw new KeyNotFoundException("Consultant profile not found.");

        var cu = await _db.CustomerProfiles
            .FirstOrDefaultAsync(x => x.UserId == customerUserId);
            
        if (cu == null)
        {
            cu = new CustomerProfile
            {
                UserId = customerUserId,
                JoinedDate = DateTime.UtcNow
            };
            _db.CustomerProfiles.Add(cu);
        }

        var existing = await _db.ClientConnections
            .FirstOrDefaultAsync(x => x.ConsultantId == cp.Id && x.CustomerId == cu.Id);

        if (existing != null)
            return new ConnectionResult(existing.Id, existing.Status);

        var conn = new ClientConnection
        {
            ConsultantId = cp.Id,
            CustomerId = cu.Id,
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };

        _db.ClientConnections.Add(conn);
        await _db.SaveChangesAsync();

        return new ConnectionResult(conn.Id, conn.Status);
    }

    public async Task<Guid> StartDirectChatAsync(Guid customerUserId, Guid consultantUserId)
    {
        var cp = await _db.ConsultantProfiles
            .FirstOrDefaultAsync(x => x.UserId == consultantUserId)
            ?? throw new KeyNotFoundException("Consultant profile not found.");

        var cu = await _db.CustomerProfiles
            .FirstOrDefaultAsync(x => x.UserId == customerUserId);

        if (cu == null)
        {
            cu = new CustomerProfile
            {
                UserId = customerUserId,
                JoinedDate = DateTime.UtcNow
            };
            _db.CustomerProfiles.Add(cu);
            await _db.SaveChangesAsync(); // save to get ID if needed
        }

        // 1. Ensure Connection exists and is accepted
        var conn = await _db.ClientConnections
            .FirstOrDefaultAsync(x => x.ConsultantId == cp.Id && x.CustomerId == cu.Id);

        if (conn == null)
        {
            conn = new ClientConnection
            {
                ConsultantId = cp.Id,
                CustomerId = cu.Id,
                Status = "accepted",
                RequestedAt = DateTime.UtcNow,
                AcceptedAt = DateTime.UtcNow
            };
            _db.ClientConnections.Add(conn);
        }
        else if (conn.Status != "accepted")
        {
            conn.Status = "accepted";
            conn.AcceptedAt = DateTime.UtcNow;
        }

        // 2. Ensure Conversation exists
        var conv = await _db.Conversations
            .FirstOrDefaultAsync(x => x.ConsultantId == cp.Id && x.CustomerId == cu.Id);

        if (conv == null)
        {
            conv = new Conversation
            {
                ConsultantId = cp.Id,
                CustomerId = cu.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _db.Conversations.Add(conv);
        }

        await _db.SaveChangesAsync();

        return conv.Id;
    }

    public async Task<CustomerProfileResult> GetMyProfileAsync(Guid userId)
    {
        var p = await _db.CustomerProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId)
            ?? throw new KeyNotFoundException("Customer profile not found.");

        return new CustomerProfileResult(
            p.UserId,
            p.User.UserName,
            p.AvatarUrl,
            p.Bio,
            p.CompanyName,
            p.Industry,
            p.JoinedDate
        );
    }

    public async Task<CustomerProfileResult> UpdateProfileAsync(Guid userId, CustomerProfileInput input)
    {
        var p = await _db.CustomerProfiles.FirstOrDefaultAsync(x => x.UserId == userId);

        if (p == null)
        {
            p = new CustomerProfile
            {
                UserId = userId,
                JoinedDate = DateTime.UtcNow
            };
            _db.CustomerProfiles.Add(p);
        }

        p.Bio = input.Bio;
        p.CompanyName = input.CompanyName;
        p.Industry = input.Industry;
        p.CityName = input.CityName;
        p.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return await GetMyProfileAsync(userId);
    }

    public async Task<string> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName)
    {
        var ext = Path.GetExtension(fileName);
        var newName = $"{Guid.NewGuid()}{ext}";
        var folder = Path.Combine("wwwroot", "uploads", "avatars");
        Directory.CreateDirectory(folder);
        var fullPath = Path.Combine(folder, newName);

        using var fs = File.Create(fullPath);
        await fileStream.CopyToAsync(fs);

        var url = $"{_baseUrl}/avatars/{newName}";

        var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
        if (profile != null)
        {
            profile.AvatarUrl = url;
            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return url;
    }

    public async Task<PagedResult<ConversationResult>> GetConversationsAsync(Guid customerUserId, int page, int pageSize)
    {
        var cu = await _db.CustomerProfiles
            .FirstOrDefaultAsync(x => x.UserId == customerUserId)
            ?? throw new KeyNotFoundException("Customer profile not found.");

        var q = _db.Conversations
            .Include(c => c.Consultant)
                .ThenInclude(cp => cp.User)
            .Include(c => c.Messages)
            .Where(c => c.CustomerId == cu.Id && c.IsActive);

        var total = await q.CountAsync();

        var results = await q
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(conv => new ConversationResult(
                conv.Id,
                conv.Consultant.UserId,
                conv.Consultant.User.UserName,
                conv.Consultant.AvatarUrl,
                conv.Messages
                    .Where(m => m.DeletedAt == null)
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.Body)
                    .FirstOrDefault(),
                conv.LastMessageAt,
                conv.Messages.Count(m =>
                    !m.IsRead &&
                    m.SenderId != customerUserId &&
                    m.DeletedAt == null)
            ))
            .ToListAsync();

        return new PagedResult<ConversationResult>(results, total, page, pageSize);
    }

    public async Task<PagedResult<MessageResult>> GetMessagesAsync(Guid conversationId, Guid requestingUserId, int page, int pageSize)
    {
        var total = await _db.Messages
            .CountAsync(m => m.ConversationId == conversationId && m.DeletedAt == null);

        var items = await _db.Messages
            .Include(m => m.Sender)
            .Include(m => m.ReplyTo)
            .Where(m => m.ConversationId == conversationId && m.DeletedAt == null)
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MessageResult(
                m.Id,
                m.SenderId,
                m.Sender.UserName,
                m.Body,
                m.MessageType,
                m.AttachmentUrl,
                m.IsRead,
                m.SentAt,
                m.ReplyToId,
                m.ReplyTo != null ? m.ReplyTo.Body : null
            ))
            .ToListAsync();

        return new PagedResult<MessageResult>(items, total, page, pageSize);
    }

    public async Task<MessageResult> SendMessageAsync(Guid conversationId, Guid senderUserId, string body, string messageType = "text", string? attachmentUrl = null, Guid? replyToId = null)
    {
        var conv = await _db.Conversations
            .Include(c => c.Customer)
            .FirstOrDefaultAsync(c => c.Id == conversationId)
            ?? throw new KeyNotFoundException("Conversation not found.");

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId = senderUserId,
            Body = body,
            MessageType = messageType,
            AttachmentUrl = attachmentUrl,
            SentAt = DateTime.UtcNow,
            ReplyToId = replyToId
        };

        // ── CREDIT CHECK — Only charge clients ─────────
        if (conv.Customer.UserId == senderUserId)
        {
            var charCount = messageType == "text" ? body?.Length ?? 0 : 0;
            var charge = await _credits.ChargeForMessageAsync(senderUserId, Guid.Empty, messageType, charCount);
            if (!charge.Success) throw new InvalidOperationException(charge.Error);
        }

        _db.Messages.Add(msg);
        conv.LastMessageAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(senderUserId);

        return new MessageResult(
            msg.Id,
            msg.SenderId,
            sender?.UserName ?? "",
            msg.Body,
            msg.MessageType,
            msg.AttachmentUrl,
            msg.IsRead,
            msg.SentAt,
            msg.ReplyToId,
            msg.ReplyTo?.Body
        );
    }

    public async Task MarkConversationReadAsync(Guid conversationId, Guid userId)
    {
        var unread = await _db.Messages
            .Where(m => m.ConversationId == conversationId
                     && m.SenderId != userId
                     && !m.IsRead
                     && m.DeletedAt == null)
            .ToListAsync();

        foreach (var m in unread)
        {
            m.IsRead = true;
            m.ReadAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}