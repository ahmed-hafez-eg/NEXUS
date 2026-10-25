$msvcBin = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64'
$sdkBin = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\bin\10.0.22621.0\x64'
$env:PATH = "$msvcBin;$sdkBin;$env:PATH"
$env:INCLUDE = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\VC\Tools\MSVC\14.44.35207\include;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Include\10.0.22621.0\ucrt;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Include\10.0.22621.0\shared;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Include\10.0.22621.0\um;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Include\10.0.22621.0\winrt;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Include\10.0.22621.0\cppwinrt'
$env:LIB = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\VC\Tools\MSVC\14.44.35207\lib\x64;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Lib\10.0.22621.0\ucrt\x64;C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10\Lib\10.0.22621.0\um\x64'
$env:VCINSTALLDIR = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\VC'
$env:VCToolsInstallDir = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\VC\Tools\MSVC\14.44.35207'
$env:VCToolsVersion = '14.44.35207'
$env:WindowsSdkDir = 'C:\Users\ah101\AppData\Local\loonghao\msvc-kit\data\Windows Kits\10'
$env:WindowsSDKVersion = '10.0.22621.0\'
$env:Platform = 'x64'

npx tauri build
