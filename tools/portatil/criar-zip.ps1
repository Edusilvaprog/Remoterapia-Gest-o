param([Parameter(Mandatory=$true)][string]$Pasta,[Parameter(Mandatory=$true)][string]$Destino)
$ErrorActionPreference='Stop'
$taskSource=(Resolve-Path -LiteralPath $Pasta).Path
$taskZip=[IO.Path]::GetFullPath($Destino)
if(Test-Path -LiteralPath $taskZip){throw 'O ZIP de destino ja existe.'}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskOutput=[IO.File]::Open($taskZip,[IO.FileMode]::CreateNew)
try{
 $taskArchive=[IO.Compression.ZipArchive]::new($taskOutput,[IO.Compression.ZipArchiveMode]::Create,$false)
 try{
  $taskPrefix=[IO.Path]::GetFileName($taskSource)+'/'
  foreach($taskFile in Get-ChildItem -LiteralPath $taskSource -Recurse -File -Force){
   $taskRelative=$taskFile.FullName.Substring($taskSource.Length+1).Replace('\','/')
   $taskEntry=$taskArchive.CreateEntry($taskPrefix+$taskRelative,[IO.Compression.CompressionLevel]::Optimal)
   $taskInput=[IO.File]::OpenRead($taskFile.FullName)
   $taskEntryStream=$taskEntry.Open()
   try{$taskInput.CopyTo($taskEntryStream)}finally{$taskInput.Dispose();$taskEntryStream.Dispose()}
  }
 }finally{$taskArchive.Dispose()}
}finally{$taskOutput.Dispose()}