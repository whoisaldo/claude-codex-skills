# Copy every skill in this repo into a skills directory (Windows).
# Symlinks need Developer Mode, so this copies; re-run after every `git pull`.
#
#   .\install.ps1                              -> $HOME\.claude\skills
#   $env:SKILLS_DIR = 'C:\path\to\skills'; .\install.ps1
$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
$SkillsDir = if ($env:SKILLS_DIR) { $env:SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }
New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
$n = 0
Get-ChildItem $Repo -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object {
  $dest = Join-Path $SkillsDir $_.Name
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Copy-Item -Recurse $_.FullName $dest
  Write-Host ("  {0,-22} -> {1}" -f $_.Name, $dest)
  $n++
}
Write-Host "Copied $n skills into $SkillsDir. Restart your agent to pick them up."
