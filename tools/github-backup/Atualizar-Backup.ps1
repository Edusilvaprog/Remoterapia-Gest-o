param([string]$Mensagem, [switch]$Verificar)
$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
function Invoke-Git {
    param([string[]]$GitArgs)
    $result = & git -c ('safe.directory=' + $PWD.Path) @GitArgs
    if ($LASTEXITCODE -ne 0) { throw ('O Git nao concluiu: ' + ($GitArgs -join ' ')) }
    return $result
}
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$config = Get-Content (Join-Path $PSScriptRoot 'backup-config.json') -Raw | ConvertFrom-Json
$repositories = @(
    @{Name='Gestao atual'; Path=(Join-Path $projectRoot ('Remoterapia-Gest' + [char]0x00E3 + 'o')); Branch='main'; Url='https://github.com/Edusilvaprog/Remoterapia-Gest-o.git'},
    @{Name='Portal atual'; Path=(Join-Path $projectRoot 'Remoterapia-Portal'); Branch='main'; Url='https://github.com/Edusilvaprog/Remoterapia-Portal.git'},
    @{Name='Previa isolada e editor'; Path=$config.previewPath; Branch='preview-editor'; Url='https://github.com/Edusilvaprog/Remoterapia-Gest-o.git'}
)
if (-not $Mensagem -and -not $Verificar) { $Mensagem = Read-Host 'Descreva a atualizacao (Enter para usar data e hora)' }
if (-not $Mensagem) { $Mensagem = 'backup: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') }
$completed = @()
try {
    foreach ($repo in $repositories) {
        if (-not (Test-Path -LiteralPath (Join-Path $repo.Path '.git'))) { throw ('Pasta de backup indisponivel: ' + $repo.Name) }
        Push-Location -LiteralPath $repo.Path
        try {
            $origin = Invoke-Git -GitArgs @('remote','get-url','origin')
            $branch = Invoke-Git -GitArgs @('branch','--show-current')
            if ($origin -ne $repo.Url -or $branch -ne $repo.Branch) { throw ('Repositorio ou versao inesperada: ' + $repo.Name + '. Nada sera sobrescrito.') }
            Invoke-Git -GitArgs @('fetch','origin',$repo.Branch) | Out-Host
            Invoke-Git -GitArgs @('merge-base','--is-ancestor',('origin/' + $repo.Branch),'HEAD') | Out-Null
            if ($Verificar) {
                Write-Host ($repo.Name + ': conexao e versao conferidas.')
                Invoke-Git -GitArgs @('status','--short') | Out-Host
                continue
            }
            Invoke-Git -GitArgs @('add','--all') | Out-Null
            $env:GIT_CONFIG_COUNT = '1'
            $env:GIT_CONFIG_KEY_0 = 'safe.directory'
            $env:GIT_CONFIG_VALUE_0 = $PWD.Path
            & node 'scripts/check-backup.cjs'
            if ($LASTEXITCODE -ne 0) { throw ('A verificacao preventiva bloqueou o envio de ' + $repo.Name + '.') }
            & git diff --cached --quiet
            if ($LASTEXITCODE -eq 1) { Invoke-Git -GitArgs @('commit','-m',$Mensagem) | Out-Host }
            elseif ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel conferir as alteracoes.' }
            Invoke-Git -GitArgs @('push','origin',('HEAD:refs/heads/' + $repo.Branch)) | Out-Host
            $completed += $repo.Name
            Write-Host ($repo.Name + ': salvo no GitHub.') -ForegroundColor Green
        } finally { Pop-Location }
    }
    if (-not $Verificar) { Write-Host 'Backup concluido. Senhas e dados do Supabase nao fazem parte deste envio.' }
} catch {
    Write-Host ('Backup interrompido: ' + $_.Exception.Message) -ForegroundColor Red
    if ($completed.Count) { Write-Host ('Ja enviados: ' + ($completed -join ', ')) }
    Write-Host 'Se outra pessoa atualizou o GitHub, peça a conciliacao das versoes. Este comando nao substitui arquivos nem forca o envio.'
    exit 1
}
