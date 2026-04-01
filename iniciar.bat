@echo off
echo ============================================
echo   GestPro - Sistema de Gestion de Proyectos
echo ============================================
echo.

REM Verificar si node esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo de https://nodejs.org
    pause
    exit /b 1
)

REM Instalar dependencias del backend
echo [1/4] Instalando dependencias del backend...
cd backend
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR instalando dependencias del backend
        pause
        exit /b 1
    )
)

REM Instalar dependencias del frontend
echo [2/4] Instalando dependencias del frontend...
cd ..\frontend
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR instalando dependencias del frontend
        pause
        exit /b 1
    )
)
cd ..

echo [3/4] Iniciando Backend (puerto 3001)...
start "GestPro Backend" cmd /k "cd backend && node src/index.js"

timeout /t 2 /nobreak >nul

echo [4/4] Iniciando Frontend (puerto 3000)...
start "GestPro Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Sistema iniciado correctamente!
echo   Abre tu navegador en: http://localhost:3000
echo   Usuario: admin@empresa.com
echo   Password: admin123
echo ============================================
echo.
start http://localhost:3000
pause
