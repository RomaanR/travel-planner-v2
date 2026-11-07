# Renders each line of script.json to a WAV with the offline Windows voice (no network).
# Usage: powershell -File audio\make-voice.ps1
Add-Type -AssemblyName System.Speech
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path (Split-Path -Parent $here) "public\audio"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$lines = Get-Content (Join-Path $here "script.json") -Raw | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 3      # -10 (slow) to 10 (fast)
$synth.Volume = 100

foreach ($l in $lines) {
  $file = Join-Path $out ("vo-" + $l.id + ".wav")
  $synth.SetOutputToWaveFile($file)
  $synth.Speak($l.text)
  $synth.SetOutputToNull()
  "{0} -> {1}" -f $l.id, $file
}
$synth.Dispose()
