use std::path::PathBuf;

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
    Ok(())
}

/// Opens native Windows FolderBrowserDialog via powershell/command.
/// Returns the selected folder path, or empty string if user cancelled.
#[tauri::command]
fn pick_folder(default_path: Option<String>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let initial_dir = default_path.unwrap_or_default().replace('\'', "''");
        let script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms;
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
$dialog.Description = 'Select Destination Folder for Obsidian Vault Export';
$dialog.UseDescriptionForTitle = $true;
$dialog.ShowNewFolderButton = $true;
if ('{0}' -ne '' -and (Test-Path '{0}')) {{
    $dialog.SelectedPath = '{0}';
}}
$result = $dialog.ShowDialog();
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.SelectedPath;
}}
"#,
            initial_dir
        );

        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to open folder picker: {e}"))?;

        let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(selected)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = default_path;
        Err("Native folder picker is currently implemented for Windows".to_string())
    }
}

#[derive(serde::Deserialize)]
pub struct VaultFileItem {
    pub relative_path: String,
    pub content: String,
}

/// Writes multiple markdown files to the chosen destination directory,
/// creating any necessary subdirectories.
#[tauri::command]
fn write_obsidian_vault(destination: String, files: Vec<VaultFileItem>) -> Result<usize, String> {
    let base = PathBuf::from(&destination);
    if !base.exists() {
        std::fs::create_dir_all(&base).map_err(|e| format!("Failed to create destination folder: {e}"))?;
    }

    let mut written_count = 0;
    for item in files {
        let file_path = base.join(&item.relative_path);
        if let Some(parent) = file_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create subfolder {}: {e}", parent.display()))?;
            }
        }
        std::fs::write(&file_path, item.content.as_bytes())
            .map_err(|e| format!("Failed to write file {}: {e}", file_path.display()))?;
        written_count += 1;
    }

    Ok(written_count)
}

/// Dispatches an HTTP request via system curl to bypass CORS and webview sandbox restrictions
#[tauri::command]
fn github_http_request(
    method: String,
    url: String,
    body: Option<String>,
    token: Option<String>,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = std::process::Command::new("curl.exe");
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.arg("-s");
        cmd.arg("-X").arg(&method);
        cmd.arg("-H").arg("Accept: application/json");
        cmd.arg("-H").arg("User-Agent: Kolo_Tamam5-App");

        if let Some(t) = token {
            if !t.trim().is_empty() {
                cmd.arg("-H").arg(format!("Authorization: Bearer {}", t.trim()));
            }
        }

        if let Some(b) = body {
            cmd.arg("-H").arg("Content-Type: application/json");
            cmd.arg("-d").arg(&b);
        }

        cmd.arg(&url);

        let output = cmd.output().map_err(|e| format!("curl execution error: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (method, url, body, token);
        Err("Not implemented on non-windows".to_string())
    }
}

/// One-time migration: copy roadmap.db from old identifier path (com.elmant5.desktop)
/// to the new identifier path (com.kolotamam5.desktop) so no data is lost on rebrand.
fn migrate_appdata_if_needed() {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let old_path: PathBuf = [&appdata, "com.elmant5.desktop", "roadmap.db"]
                .iter()
                .collect();
            let new_dir: PathBuf = [&appdata, "com.kolotamam5.desktop"]
                .iter()
                .collect();
            let new_path: PathBuf = new_dir.join("roadmap.db");

            // Only copy if old file exists AND new file does NOT yet exist
            if old_path.exists() && !new_path.exists() {
                if let Err(e) = std::fs::create_dir_all(&new_dir) {
                    eprintln!("[Kolo_Tamam5] Failed to create new AppData dir: {e}");
                    return;
                }
                match std::fs::copy(&old_path, &new_path) {
                    Ok(_) => println!(
                        "[Kolo_Tamam5] Migrated roadmap.db from old identifier path to new path. Old file kept as backup."
                    ),
                    Err(e) => eprintln!("[Kolo_Tamam5] Failed to copy roadmap.db: {e}"),
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Run AppData migration before Tauri opens the database
    migrate_appdata_if_needed();

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            open_url,
            pick_folder,
            write_obsidian_vault,
            github_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
