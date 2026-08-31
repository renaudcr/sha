@echo off
del "%TEMP%\watcher_stop.flag" >nul 2>&1

:: Start watcher in background
start /b cmd /c "%~dp0watcher.bat"

:: Run npm start (blocks until it ends)
npm start

:: npm start ended — signal watcher to stop
echo stop > "%TEMP%\watcher_stop.flag"
echo [%time%] npm start ended. Watcher will stop on next cycle.
