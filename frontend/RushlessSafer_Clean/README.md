# Rushless Safer - Exam Lockdown Application

Aplikasi ini mengunci komputer siswa untuk menampilkan halaman ujian. Aplikasi ini dirancang untuk bekerja dengan ExamApp frontend Anda.

## Prasyarat

1.  **.NET 8 SDK (atau lebih baru):** [Unduh .NET](https://dotnet.microsoft.com/download)
2.  **Visual Studio 2022:** [Unduh Visual Studio](https://visualstudio.microsoft.com/downloads/) (Edisi Community gratis). Pastikan Anda menyertakan workload ".NET desktop development" saat instalasi.
3.  **WebView2 Runtime:** Komponen ini biasanya sudah ter-install di Windows 11/10 modern. Jika belum, siswa akan diminta untuk menginstalnya saat pertama kali menjalankan aplikasi, atau Anda bisa menyertakannya dalam paket instalasi. [Unduh WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

## Cara Membangun (Compile) Aplikasi

1.  **Buat Proyek Baru:**
    *   Buka Visual Studio.
    *   Pilih "Create a new project".
    *   Cari dan pilih "Windows Forms App" (menggunakan C#). Klik Next.
    *   Beri nama proyek `RushlessSafer`.
    *   **Pindahkan folder `RushlessSafer_Source` ini ke `D:\Hasil Coding\ExamApp\` dan ganti namanya menjadi `RushlessSafer`. Kemudian atur lokasi proyek ke folder tersebut.**
    *   Pilih .NET 8.0 sebagai framework. Klik Create.

2.  **Tambahkan Paket WebView2:**
    *   Di Visual Studio, buka `Project` > `Manage NuGet Packages...`.
    *   Buka tab "Browse".
    *   Cari `Microsoft.Web.WebView2`.
    *   Pilih dan klik "Install".

3.  **Salin Kode:**
    *   Visual Studio akan membuat file `Program.cs` dan `Form1.cs`.
    *   Ganti nama `Form1.cs` menjadi `LockdownForm.cs`. Visual Studio akan bertanya apakah Anda ingin mengganti semua referensi, klik **Yes**.
    *   Salin konten dari file `Program.cs` yang saya berikan dan tempelkan ke `Program.cs` di proyek Anda.
    *   Salin konten dari file `LockdownForm.cs` yang saya berikan dan tempelkan ke `LockdownForm.cs` di proyek Anda.

4.  **Compile:**
    *   Buka `Build` > `Build Solution`.
    *   Ini akan membuat file `RushlessSafer.exe` di dalam folder `bin\Debug` atau `bin\Release` di direktori proyek Anda.

## Instalasi untuk Siswa

1.  **Distribusikan Aplikasi:** Berikan file `RushlessSafer.exe` (dan file lain yang ada di folder `bin\Release`) kepada siswa. Mereka bisa meletakkannya di folder mana pun, misalnya `C:\Program Files\RushlessSafer\`.
2.  **Daftarkan Protokol:**
    *   Berikan file `register_protocol.reg` kepada siswa.
    *   **PENTING:** Siswa harus mengedit file `register_protocol.reg` tersebut. Mereka harus mengubah path `"C:\Program Files\RushlessSafer\RushlessSafer.exe"` menjadi path aktual tempat mereka menyimpan file `.exe` nya. **Perhatikan penggunaan backslash ganda `\`**.
    *   Setelah diedit, siswa harus **menjalankan (double-click) file `.reg`** tersebut dan menerima konfirmasi untuk menambahkan informasinya ke Windows Registry. Ini hanya perlu dilakukan sekali.

Setelah langkah-langkah ini selesai, setiap kali siswa mengklik link yang diawali dengan `exam-lock://` di browser, aplikasi `RushlessSafer` akan terbuka secara otomatis.
