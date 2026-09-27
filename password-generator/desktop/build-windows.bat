@echo off
REM Builds PasswordVault.exe on Windows.
REM
REM PyInstaller cannot cross-compile, so the Linux and macOS binaries are
REM produced by the GitHub Actions workflow instead:
REM   .github/workflows/build-desktop.yml
setlocal

cd /d "%~dp0"

echo.
echo === 1/3  checking Python ===
python --version || goto :nopython

echo.
echo === 2/3  installing build + runtime dependencies ===
python -m pip install --upgrade pip --quiet
python -m pip install --quiet pyinstaller cryptography
if errorlevel 1 goto :nodeps

echo.
echo === 3/3  running the test suite ===
python test_pwvault.py || goto :tests
python test_pwvault_gui.py || goto :tests

echo.
echo === building PasswordVault.exe ===
python -m PyInstaller --clean --noconfirm PasswordVault.spec
if errorlevel 1 goto :nobuild

REM Publish into ../downloads, which is what index.html links to and what
REM GitHub Pages serves. Keeping dist/ ignored means the build folder stays
REM disposable while the published copy is committed.
set VERSION=1.0.0
if not exist "%~dp0..\downloads" mkdir "%~dp0..\downloads"
copy /y "dist\PasswordVault.exe" "..\downloads\PasswordVault-%VERSION%-windows-x64.exe" >nul
copy /y "pwvault.py" "..\downloads\pwvault-%VERSION%.py" >nul
if errorlevel 1 goto :nopublish

echo.
echo Done.
echo   binary  dist\PasswordVault.exe
echo   published ..\downloads\PasswordVault-%VERSION%-windows-x64.exe
echo   source    ..\downloads\pwvault-%VERSION%.py
echo.
echo Windows may warn about an unrecognised publisher because the binary is not
echo code-signed. Choose "More info" then "Run anyway", or build and sign it
echo yourself.
goto :eof

:nopython
echo Python 3.10 or newer is required on PATH.
exit /b 1

:nodeps
echo Could not install pyinstaller / cryptography.
exit /b 1

:tests
echo Tests failed, so the build was not attempted.
exit /b 1

:nobuild
echo PyInstaller failed.
exit /b 1

:nopublish
echo The build succeeded but copying into ..\downloads failed.
exit /b 1
