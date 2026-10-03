@echo off
cd /d "%~dp0"
python -B run.py --open
if errorlevel 1 pause

