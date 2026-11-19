using Microsoft.Win32;
using OPEX.Desktop.Services;
using System.Windows;

namespace OPEX.Desktop;

public partial class MainWindow : Window
{
    private readonly WorkspaceService _workspace = new();
    private readonly JsonStore _store;

    public MainWindow()
    {
        InitializeComponent();
        _store = new JsonStore(_workspace);
    }

    private async void ConnectButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new OpenFolderDialog
        {
            Title = "Select the shared OPEX network folder",
            Multiselect = false
        };
        if (picker.ShowDialog(this) != true) return;

        ConnectButton.IsEnabled = false;
        try
        {
            await _workspace.ConnectAsync(picker.FolderName);
            var passed = await _workspace.TestSharedWriteAsync();
            ConnectionLabel.Text = "SHARED WORKSPACE CONNECTED";
            ConnectionLabel.Foreground = System.Windows.Media.Brushes.LightGreen;
            StorageStatus.Text = "Connected";
            WriteStatus.Text = passed ? "Passed" : "Failed";
            WorkspacePath.Text = _workspace.RootPath;
            ActivityText.Text = "Workspace structure initialized. Shared folder is writable from this workstation.";
            TestButton.IsEnabled = true;
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Workspace setup failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { ConnectButton.IsEnabled = true; }
    }

    private async void TestButton_Click(object sender, RoutedEventArgs e)
    {
        TestButton.IsEnabled = false;
        try
        {
            var passed = await _workspace.TestSharedWriteAsync();
            WriteStatus.Text = passed ? "Passed" : "Failed";
            ActivityText.Text = passed
                ? "Shared-folder create/write/close/delete test passed. This does not yet prove multi-user transaction safety."
                : "Shared-folder write test failed.";
        }
        catch (Exception ex)
        {
            WriteStatus.Text = "Failed";
            ActivityText.Text = ex.Message;
        }
        finally { TestButton.IsEnabled = true; }
    }
}
