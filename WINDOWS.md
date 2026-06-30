# Running on Windows 11

## Prerequisites

1. **Install Docker Desktop for Windows**
   - Download from https://docs.docker.com/desktop/setup/install/windows-install/
   - Run the installer — ensure **WSL2 backend** is selected
   - After install, launch Docker Desktop and wait for the green "Running" status

2. **Install WSL2** (if not already done)
   - Open **PowerShell as Administrator** and run:
     ```powershell
     wsl --install
     ```
   - Restart your computer

3. **Enable file sharing** (if using a different drive than C:)
   - Right-click Docker Desktop tray icon → **Settings**
   - **Resources → File Sharing**
   - Add the drive where your project is located (e.g., `D:\`)
   - Click **Apply & Restart**

## Setup

### 1. Get the project

```powershell
git clone https://github.com/Bibekshah123/AI-based-Crop-Disease-Detection.git
cd AI-based-Crop-Disease-Detection
```

Or copy the project folder manually to your Windows machine.

### 2. Place the model weights

The model file is not tracked by git (too large). You need to place it manually:

```powershell
# Create the directory if it doesn't exist
mkdir backend\updated-model -Force

# Copy your model.weights.h5 file there
# (e.g., from Google Drive, Kaggle download, or USB drive)
copy D:\path\to\model.weights.h5 backend\updated-model\model.weights.h5
```

Verify it's in place:
```powershell
dir backend\updated-model\model.weights.h5
```

### 3. Start the application

```powershell
docker compose up --build -d
```

This starts four services:
- **Database** (PostgreSQL 16) — internal, no direct access needed
- **Backend** (FastAPI) — `http://localhost:8000`
- **Frontend** (React + Nginx) — `http://localhost:3000` ← **open this in your browser**
- **Adminer** (DB GUI) — `http://localhost:8080`

First startup may take 2-3 minutes while the backend loads the model.

### 4. Use the app

Open **http://localhost:3000** in your browser.

1. **Sign up** — create an account
2. **Log in** — use your credentials
3. **Upload a crop leaf photo** — get disease prediction in English + Nepali

### 5. Stop the application

```powershell
docker compose down
```

To also delete the database data:
```powershell
docker compose down -v
```

## Troubleshooting

### "model.weights.h5 not found"

The model file must be at `backend/updated-model/model.weights.h5`. If missing, download or copy it there and run `docker compose restart backend`.

### Permission errors on volume mount

Right-click Docker Desktop → **Settings → Resources → File Sharing** and add the drive containing your project.

### Port already in use

If port 3000, 8000, or 8080 is occupied, change the host port in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"   # change 3000 to 3001
```

### "Internal Server Error" on prediction

Check backend logs:
```powershell
docker compose logs backend
```

### Need the Adminer database GUI

Open http://localhost:8080 and log in with:
- **System**: PostgreSQL
- **Server**: db
- **Username**: app
- **Password**: app_password
- **Database**: crop_disease

## File Structure

```
AI-based-Crop-Disease-Detection/
├── backend/              # FastAPI + model
│   ├── main.py           # API endpoints
│   ├── auth.py           # JWT authentication
│   ├── db.py             # PostgreSQL connection
│   ├── class_names.json  # 24 class labels (update after 41-class retrain)
│   ├── disease_info.json # Disease info in EN + NP
│   └── updated-model/
│       └── model.weights.h5  # Model weights (129 MB, not in git)
├── frontend/             # React + Vite
│   └── src/
│       ├── App.jsx       # Main component with routing
│       ├── AuthContext.jsx
│       ├── Predict.jsx   # Prediction page
│       ├── History.jsx   # Prediction history
│       └── ...
├── docker-compose.yml    # All services
├── database/
│   └── schema.sql        # Database schema
├── scripts/
│   ├── train_colab.ipynb # Training notebook (Kaggle)
│   └── download_model.sh # Model download script
├── .gitignore
└── README.md
```
