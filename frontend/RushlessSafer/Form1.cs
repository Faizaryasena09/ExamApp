
using Microsoft.Web.WebView2.Core;
using System.Diagnostics;
using System.Text.Json;

namespace RushlessSafer
{
    public partial class LockdownForm : Form
    {
        private readonly string _initialUrl;
        private readonly string _cookies;
        private KeyboardHook _keyboardHook;

        public LockdownForm(string url, string cookies)
        {
            _initialUrl = url;
            _cookies = cookies;
            InitializeComponent();
            InitializeSecurityFeatures();
            InitializeWebView();
        }

        private void InitializeSecurityFeatures()
        {
            // 1. Install low-level keyboard hook
            _keyboardHook = new KeyboardHook();

            // 2. Bring form to front and make fullscreen
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;
        }

        private async void InitializeWebView()
        {
            await webView.EnsureCoreWebView2Async(null);

            // Handle messages from web content
            webView.CoreWebView2.WebMessageReceived += HandleWebMessage;

            // Set cookies
            var cookieManager = webView.CoreWebView2.CookieManager;
            var domain = new Uri(_initialUrl).Host;
            if (!string.IsNullOrEmpty(_cookies))
            {
                var cookiePairs = _cookies.Split(';');
                foreach (var cookiePair in cookiePairs)
                {
                    var parts = cookiePair.Trim().Split('=');
                    if (parts.Length == 2)
                    {
                        var cookie = cookieManager.CreateCookie(parts[0], parts[1], domain, "/");
                        cookieManager.AddOrUpdateCookie(cookie);
                    }
                }
            }

            // Navigate to the target URL
            webView.CoreWebView2.Navigate(_initialUrl);
        }

        private void HandleWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            var jsonMessage = args.WebMessageAsJson;
            if (string.IsNullOrEmpty(jsonMessage)) return;

            try
            {
                var message = JsonDocument.Parse(jsonMessage);
                var root = message.RootElement;
                if (root.TryGetProperty("type", out var typeElement))
                {
                    string type = typeElement.GetString() ?? "";
                    if (string.Equals(type, "unlock", StringComparison.OrdinalIgnoreCase))
                    {
                        Environment.Exit(0);
                    }
                    else if (string.Equals(type, "redirect", StringComparison.OrdinalIgnoreCase))
                    {
                        if (root.TryGetProperty("url", out var urlElement))
                        {
                            string redirectUrl = urlElement.GetString() ?? "";
                            if (!string.IsNullOrEmpty(redirectUrl))
                            {
                                Process.Start(new ProcessStartInfo(redirectUrl) { UseShellExecute = true });
                                Environment.Exit(0);
                            }
                        }
                    }
                }
            }
            catch (JsonException) { /* Ignore invalid JSON */ }
        }

        private void LockdownForm_Load(object sender, EventArgs e)
        {
            // Kill Explorer Shell
            Process.Start(new ProcessStartInfo("taskkill", "/f /im explorer.exe") { CreateNoWindow = true });

            // Start battery timer
            batteryTimer.Start();
            batteryTimer_Tick(sender, e); // Initial tick
        }

        private void LockdownForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            // Restart Explorer Shell
            Process.Start("explorer.exe");

            // Dispose keyboard hook
            _keyboardHook.Dispose();
        }

        private void batteryTimer_Tick(object sender, EventArgs e)
        { 
            var powerStatus = SystemInformation.PowerStatus;
            lblBattery.Visible = powerStatus.BatteryChargeStatus != BatteryChargeStatus.NoSystemBattery;
            if (!lblBattery.Visible) return;

            string status = "";
            switch (powerStatus.PowerLineStatus)
            {
                case PowerLineStatus.Online:
                    status = "(Mengisi Daya)";
                    break;
                case PowerLineStatus.Offline:
                    status = "";
                    break;
                case PowerLineStatus.Unknown:
                    status = "(Status Tidak Diketahui)";
                    break;
            }
            float percent = powerStatus.BatteryLifePercent * 100;
            lblBattery.Text = $"Baterai: {percent:F0}% {status}";
        }

        private void btnWifi_Click(object sender, EventArgs e)
        {
            // Open Windows' available networks flyout
            Process.Start(new ProcessStartInfo("explorer.exe", "ms-availablenetworks:") { UseShellExecute = true });
        }
    }
}
