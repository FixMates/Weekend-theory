using System.IO;
using System.Text.Json;

namespace OPEX.Desktop.Services;

public sealed class WorkspaceService
{
    private static readonly string[] RequiredFolders =
    [
        "_system", "_auth/sessions", "data", "dashboards", "dashboards/_locks",
        "_cache", "_audit", "_outbox", "_notifications", "_email_outbox",
        "_exports/jobs", "_exports/files", "_locks", "attachments", "backups", "templates"
    ];

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public string? RootPath { get; private set; }
    public bool IsConnected => RootPath is not null && Directory.Exists(RootPath);

    public async Task ConnectAsync(string selectedPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(selectedPath))
            throw new ArgumentException("Select a workspace folder.", nameof(selectedPath));

        var fullPath = Path.GetFullPath(selectedPath);
        if (!Directory.Exists(fullPath))
            throw new DirectoryNotFoundException("The selected folder does not exist.");

        // Probe write access before initializing anything; mapped drives and UNC paths
        // can be visible while the current Windows account lacks write permissions.
        var probe = Path.Combine(fullPath, $".opex-write-test-{Guid.NewGuid():N}.tmp");
        await File.WriteAllTextAsync(probe, "OPEX", cancellationToken);
        File.Delete(probe);

        foreach (var relative in RequiredFolders)
            Directory.CreateDirectory(Path.Combine(fullPath, relative));

        var marker = Path.Combine(fullPath, "_system", "workspace.json");
        if (!File.Exists(marker))
        {
            var config = new
            {
                product = "OPEX Local",
                schemaVersion = 1,
                createdUtc = DateTimeOffset.UtcNow,
                storageMode = "SMB-shared-folder",
                workspaceId = Guid.NewGuid().ToString("N")
            };
            var json = JsonSerializer.Serialize(config, JsonOptions);
            await AtomicWriteAsync(marker, json, cancellationToken);
        }

        RootPath = fullPath;
    }

    public async Task<bool> TestSharedWriteAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected) return false;
        var testFile = Path.Combine(RootPath!, "_locks", $"connectivity-{Guid.NewGuid():N}.tmp");
        try
        {
            await using (var stream = new FileStream(testFile, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, true))
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(Environment.MachineName);
                await stream.WriteAsync(bytes, cancellationToken);
                await stream.FlushAsync(cancellationToken);
            }
            File.Delete(testFile);
            return true;
        }
        catch
        {
            if (File.Exists(testFile)) File.Delete(testFile);
            throw;
        }
    }

    private static async Task AtomicWriteAsync(string path, string contents, CancellationToken cancellationToken)
    {
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        await File.WriteAllTextAsync(temp, contents, cancellationToken);
        if (File.Exists(path)) File.Replace(temp, path, null, true);
        else File.Move(temp, path);
    }
}
