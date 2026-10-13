$ErrorActionPreference = 'Stop'
$env:NEXT_PUBLIC_LOCAL_PREVIEW = '1'
$runtimeExe = 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$env:PATH = (Split-Path -Parent $runtimeExe) + ';' + $env:PATH
$projectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$managementDir = Join-Path $projectDir ('Remoterapia-Gest' + [char]0x00E3 + 'o')
$portalDir = Join-Path $projectDir 'Remoterapia-Portal'
$localServices = @(
    @{ Name = 'gestao'; Port = 3015; Directory = $managementDir; Args = @('node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3015') },
    @{ Name = 'portal'; Port = 3016; Directory = $portalDir; Args = @('node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3016') },
    @{ Name = 'editor'; Port = 3010; Directory = $PSScriptRoot; Args = @('server.cjs') }
)
foreach ($localService in $localServices) {
    $existingListener = Get-NetTCPConnection -LocalPort $localService.Port -State Listen -ErrorAction SilentlyContinue
    if ($existingListener) {
        if ($localService.Name -eq 'editor') {
            $editorState = Invoke-RestMethod -Uri 'http://localhost:3010/api/state'
            if ($editorState.mode -ne 'local-preview' -or $editorState.isolated -ne $true) { throw 'A porta do editor pertence a outra versão. Feche o editor antigo antes de abrir esta prévia.' }
        }
        Write-Host ($localService.Name + ' ja tem um servidor na porta ' + $localService.Port)
        continue
    }
    Start-Process -FilePath $runtimeExe -ArgumentList $localService.Args -WorkingDirectory $localService.Directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot ($localService.Name + '.out.log')) -RedirectStandardError (Join-Path $PSScriptRoot ($localService.Name + '.err.log')) | Out-Null
    Write-Host ($localService.Name + ' iniciado.')
}
Write-Host 'Gestao: http://localhost:3015/gestao/painel'
Write-Host 'Portal: http://localhost:3016/'
Write-Host 'Editor: http://localhost:3010/'

