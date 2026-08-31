@echo off
del "%TEMP%\watcher_stop.flag" >nul 2>&1

:loop
:: Check if we should stop
if exist "%TEMP%\watcher_stop.flag" (
    del "%TEMP%\watcher_stop.flag" >nul 2>&1
    echo [%time%] Watcher stopped.
    exit /b
)

:: Check and kill 123.exe
tasklist /fi "imagename eq 123.exe" /fo csv /nh 2>nul | find "123.exe" >nul
if %errorlevel%==0 (
    echo [%time%] Found 123.exe - killing it...
    taskkill /f /im "123.exe" >nul 2>&1
    echo [%time%] Killed.
) else (
    echo [%time%] 123.exe not running.
)

timeout /t 15 /nobreak >nul
goto loop
