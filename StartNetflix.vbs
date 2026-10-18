Set objFSO = CreateObject("Scripting.FileSystemObject")
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath

exePath1 = strPath & "\..\release_kudflix\win-unpacked\Kudflix.exe"

If objFSO.FileExists(exePath1) Then
  WshShell.Run """" & exePath1 & """", 1, False
Else
  WshShell.Run "cmd.exe /c npm start", 0, False
End If
