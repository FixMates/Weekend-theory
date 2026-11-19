using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace OPEX.Desktop.Services;

/// <summary>
/// Shared-folder persistence primitives. All writes are serialized by exclusive SMB
/// lock files and written via temp-file replacement where a single JSON document is used.
/// </summary>
public sealed class JsonStore(WorkspaceService workspace)
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public async Task<T?> ReadAsync<T>(string relativePath, CancellationToken cancellationToken = default)
    {
        var path = Resolve(relativePath);
        if (!File.Exists(path)) return default;
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 65536, true);
        return await JsonSerializer.DeserializeAsync<T>(stream, Options, cancellationToken);
    }

    public async Task WriteDocumentAsync<T>(string relativePath, T value, CancellationToken cancellationToken = default)
    {
        var path = Resolve(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var lease = await AcquireLockAsync(path + ".lock", TimeSpan.FromSeconds(15), cancellationToken);
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true))
                await JsonSerializer.SerializeAsync(stream, value, Options, cancellationToken);
            if (File.Exists(path)) File.Replace(temp, path, null, true);
            else File.Move(temp, path);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    public async Task AppendLineAsync<T>(string relativePath, T record, CancellationToken cancellationToken = default)
    {
        var path = Resolve(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var lease = await AcquireLockAsync(path + ".lock", TimeSpan.FromSeconds(15), cancellationToken);
        var line = JsonSerializer.Serialize(record) + Environment.NewLine;
        var bytes = Encoding.UTF8.GetBytes(line);
        await using var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read, 65536, true);
        await stream.WriteAsync(bytes, cancellationToken);
        await stream.FlushAsync(cancellationToken);
        stream.Flush(true);
    }

    public async Task<FileStream> AcquireLockAsync(string lockPath, TimeSpan timeout, CancellationToken cancellationToken = default)
    {
        var deadline = DateTime.UtcNow + timeout;
        Directory.CreateDirectory(Path.GetDirectoryName(lockPath)!);
        while (DateTime.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var stream = new FileStream(lockPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 4096, true);
                var payload = Encoding.UTF8.GetBytes($"{Environment.MachineName}|{Environment.UserName}|{DateTimeOffset.UtcNow:O}");
                await stream.WriteAsync(payload, cancellationToken);
                await stream.FlushAsync(cancellationToken);
                return stream;
            }
            catch (IOException) { await Task.Delay(150, cancellationToken); }
        }
        throw new TimeoutException($"Could not acquire shared-file lock: {Path.GetFileName(lockPath)}");
    }

    private string Resolve(string relativePath)
    {
        if (!workspace.IsConnected) throw new InvalidOperationException("Connect the OPEX workspace first.");
        var root = Path.GetFullPath(workspace.RootPath!);
        var path = Path.GetFullPath(Path.Combine(root, relativePath));
        if (!path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Path traversal was blocked.");
        return path;
    }
}
