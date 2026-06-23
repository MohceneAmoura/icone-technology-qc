@echo off
title Icone Technology Quality Control Workspace
echo =======================================================
echo    🏭 Icone Technology Quality Control Web System 🏭
echo =======================================================
echo.

:: Check for node_modules in root
if not exist "node_modules\" (
    echo [1/3] Root dependencies missing. Installing...
    call npm install
) else (
    echo [1/3] Root dependencies already installed.
)

:: Check for node_modules in backend
if not exist "backend\node_modules\" (
    echo [2/3] Backend dependencies missing. Installing...
    call npm install --prefix backend
) else (
    echo [2/3] Backend dependencies already installed.
)

:: Check for node_modules in frontend
if not exist "frontend\node_modules\" (
    echo [3/3] Frontend dependencies missing. Installing...
    call npm install --prefix frontend
) else (
    echo [3/3] Frontend dependencies already installed.
)

echo.
echo =======================================================
echo     🚀 Starting Backend API and Frontend Server...
echo =======================================================
echo.
echo  - Backend will run on http://localhost:5000
echo  - Frontend will run on http://localhost:3000
echo.
echo Press Ctrl+C in this terminal to stop the servers.
echo.

call npm run dev
pause
