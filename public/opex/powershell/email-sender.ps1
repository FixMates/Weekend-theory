param([Parameter(Mandatory=$true)][string]$OutboxPath,[Parameter(Mandatory=$true)][string]$SmtpServer,[int]$Port=587,[Parameter(Mandatory=$true)][string]$From,[Parameter(Mandatory=$true)][string]$CredentialFile)
# Use an IT-managed credential export; never commit credentials to this repository.
$credential = Import-Clixml -Path $CredentialFile
Get-ChildItem -Path $OutboxPath -Filter *.json -File | ForEach-Object {
  try {
    $mail = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($mail.status -ne 'queued') { return }
    $message = [System.Net.Mail.MailMessage]::new()
    $message.From = $From
    foreach ($address in $mail.to) { if ($address) { [void]$message.To.Add($address) } }
    foreach ($address in $mail.cc) { if ($address) { [void]$message.CC.Add($address) } }
    $message.Subject = $mail.subject
    $message.Body = $mail.body_text
    $client = [System.Net.Mail.SmtpClient]::new($SmtpServer,$Port)
    $client.EnableSsl = $true
    $client.Credentials = $credential.GetNetworkCredential()
    $client.Send($message)
    $message.Dispose(); $client.Dispose()
    Remove-Item $_.FullName -Force
  } catch { Write-Error ("Failed "+$_.Name+": "+$_.Exception.Message) }
}