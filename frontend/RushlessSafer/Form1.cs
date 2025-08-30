using Microsoft.Web.WebView2.Core;
using System.Diagnostics;
using System.Text.Json;

namespace RushlessSafer
{
    public partial class LockdownForm : Form
    {
        private readonly string _initialUrl;
        private readonly string _cookies;

        public LockdownForm(string url, string cookies)
        {
            _initialUrl = url;
            _cookies = cookies;
            InitializeComponent();
            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            // Setup form to be a fullscreen kiosk
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;

            // Initialize WebView2
            await webView.EnsureCoreWebView2Async(null);

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

            // Handle messages from web content
            webView.CoreWebView2.WebMessageReceived += HandleWebMessage;

            // Navigate to the target URL
            webView.CoreWebView2.Navigate(_initialUrl);
        }

        private void HandleWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            var jsonMessage = args.TryGetWebMessageAsString();
            if (string.IsNullOrEmpty(jsonMessage)) return;

            try
            {
                var message = JsonDocument.Parse(jsonMessage);
                var root = message.RootElement;
                if (root.TryGetProperty("type", out var typeElement))
                {
                    string type = typeElement.GetString() ?? "";
                    if (type == "unlock")
                    {
                        // LANGKAH DIAGNOSTIK: Paksa proses untuk berhenti.
                        Environment.Exit(0);
                    }
                    else if (type == "redirect" && root.TryGetProperty("url", out var urlElement))
                    {
                        string redirectUrl = urlElement.GetString() ?? "";
                        if (!string.IsNullOrEmpty(redirectUrl))
                        {
                            Process.Start(new ProcessStartInfo(redirectUrl) { UseShellExecute = true });
                            // LANGKAH DIAGNOSTIK: Paksa proses untuk berhenti.
                            Environment.Exit(0);
                        }
                    }
                }
            }
            catch (JsonException)
            {
                // Abaikan jika format JSON tidak valid
            }
        }

        // Emergency Exit: Ctrl+Alt+Shift+E
        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == (Keys.Control | Keys.Alt | Keys.Shift | Keys.E))
            {
                Application.Exit();
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }
    }
}