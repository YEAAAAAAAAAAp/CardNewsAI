@echo off
setlocal
set PYTHONPATH=src
set PYTHON=C:\Users\disco\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe

if "%~1"=="" (
  echo Usage: run_factory.bat "cardnews topic"
  exit /b 1
)

"%PYTHON%" main.py --topic %*
