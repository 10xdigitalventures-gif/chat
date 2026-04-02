using Microsoft.EntityFrameworkCore;
using TenXConvo.Infrastructure.Data;
using TenXConvo.Domain.Entities;
using System;
using System.Linq;

namespace Diagnostics;

class Program
{
    static void Main()
    {
        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite("Data Source=publish_final/tenxconvo_dev.db")
                .Options;

            using var db = new AppDbContext(options);
            var errors = db.ErrorLogs.OrderByDescending(e => e.CreatedOn).Take(5).ToList();
            
            if (errors.Count == 0)
            {
                Console.WriteLine("No errors found in ErrorLogs table.");
                return;
            }

            foreach (var e in errors)
            {
                Console.WriteLine("================================================================================");
                Console.WriteLine($"CREATED: {e.CreatedOn}");
                Console.WriteLine($"ACTION:  {e.ActionName} in {e.ControllerName}");
                Console.WriteLine($"MESSAGE: {e.ErrorMessage}");
                Console.WriteLine("--------------------------------------------------------------------------------");
                Console.WriteLine(e.StackTrace);
                Console.WriteLine("================================================================================");
                Console.WriteLine();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Diagnostic tool failed: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }
}
