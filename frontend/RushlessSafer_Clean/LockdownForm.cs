using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.Collections.Specialized;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Windows.Forms;

namespace RushlessSafer
{
    public partial class LockdownForm : Form
    {
        private WebView2 webView;
        private string initialUrl;
        private string _authToken = null;
        private string _userDataFolder = null;

        private bool ctrlPressed = false;
        private bool altPressed = false;
        private bool shiftPressed = false;

        public LockdownForm(string url)
        {
            InitializeComponent();
            this.initialUrl = url;

            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;

            InitializeWebView();

            this.KeyPreview = true;
            this.KeyDown += new KeyEventHandler(LockdownForm_KeyDown);
            this.KeyUp += new KeyEventHandler(LockdownForm_KeyUp);
        }

        private async void InitializeWebView()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            this.Controls.Add(webView);

            try
            {
                if (string.IsNullOrEmpty(initialUrl) || !initialUrl.StartsWith("exam-lock:"))
                {
                    LogToFile("Invalid initial URL or not exam-lock protocol.");
                    await webView.EnsureCoreWebView2Async(null);
                    webView.CoreWebView2.NavigateToString("<h1>Error: Invalid exam URL.</h1><p>Please launch the exam from your course page.</p>");
                    return;
                }

                // Buat folder user data sementara
                _userDataFolder = Path.Combine(Path.GetTempPath(), "RushlessSafer_" + Guid.NewGuid().ToString());
                Directory.CreateDirectory(_userDataFolder);
                LogToFile($"User data folder created: {_userDataFolder}");

                // ✅ Decode hanya sekali
                string decodedUrl = WebUtility.UrlDecode(initialUrl.Substring("exam-lock:".Length));
                if (decodedUrl.StartsWith("//"))
                {
                    decodedUrl = decodedUrl.Substring(2);
                }

                Uri uri = new Uri(decodedUrl);
                NameValueCollection query = HttpUtility.ParseQueryString(uri.Query);

                _authToken = query["token"];
                string userAgent = query["userAgent"];
                string userId = query["userId"];
                string name = query["name"];
                string role = query["role"];

                LogToFile($"Parsed Query Params: Token={(_authToken != null ? "[PRESENT]" : "[MISSING]")}, UserAgent={userAgent}, UserId={userId}, Name={name}, Role={role}");

                string navigationUrl = uri.GetLeftPart(UriPartial.Path);
                LogToFile($"Navigation URL: {navigationUrl}");

                // Setup WebView2 environment dengan custom user-agent
                var options = new CoreWebView2EnvironmentOptions();
                if (!string.IsNullOrEmpty(userAgent))
                {
                    options.AdditionalBrowserArguments = $"--user-agent=\"{userAgent}\"";
                }

                var environment = await CoreWebView2Environment.CreateAsync(null, _userDataFolder, options);
                await webView.EnsureCoreWebView2Async(environment);
                LogToFile("WebView2 environment created and ensured.");

                // ✅ Clear semua browsing data sebelum mulai
                await webView.CoreWebView2.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.All);
                LogToFile("Browsing data cleared before cookie injection.");

                // ✅ Inject cookies
                string cookieDomain = uri.Host; // contoh: "localhost"
                if (!string.IsNullOrEmpty(userId))
                {
                    var cookie = webView.CoreWebView2.CookieManager.CreateCookie("user_id", userId, cookieDomain, "/");
                    webView.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
                    LogToFile($"Added cookie: user_id={userId}");
                }
                if (!string.IsNullOrEmpty(name))
                {
                    var cookie = webView.CoreWebView2.CookieManager.CreateCookie("name", name, cookieDomain, "/");
                    webView.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
                    LogToFile($"Added cookie: name={name}");
                }
                if (!string.IsNullOrEmpty(role))
                {
                    var cookie = webView.CoreWebView2.CookieManager.CreateCookie("role", role, cookieDomain, "/");
                    webView.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
                    LogToFile($"Added cookie: role={role}");
                }
                if (!string.IsNullOrEmpty(_authToken))
                {
                    var cookie = webView.CoreWebView2.CookieManager.CreateCookie("token", _authToken, cookieDomain, "/");
                    webView.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
                    LogToFile("Added cookie: token=[PRESENT]");
                }

                // Event handler
                webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
                webView.CoreWebView2.WebResourceRequested += CoreWebView2_WebResourceRequested;

                // Navigate
                webView.CoreWebView2.Navigate(navigationUrl);
                LogToFile($"Navigating to: {navigationUrl}");
            }
            catch (Exception ex)
            {
                LogToFile($"Error during InitializeWebView: {ex.Message}");
                MessageBox.Show($"An error occurred: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                CleanupAndExit();
            }
        }

        private void CoreWebView2_WebResourceRequested(object sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            LogToFile($"WebResourceRequested: URL={e.Request.Uri}");
            if (!string.IsNullOrEmpty(_authToken))
            {
                e.Request.Headers.SetHeader("Authorization", "Bearer " + _authToken);
                LogToFile($"  Authorization header set for {e.Request.Uri}");
            }
            else
            {
                LogToFile($"  No auth token to set for {e.Request.Uri}");
            }
        }

        private void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            string message = args.TryGetWebMessageAsString();
            LogToFile($"WebMessageReceived: {message}");
            if (message != null && message.StartsWith("UNLOCK"))
            {
                CleanupAndExit();
            }
        }

        private async void CleanupAndExit()
        {
            LogToFile("CleanupAndExit started.");
            try
            {
                if (webView?.CoreWebView2 != null)
                {
                    await webView.CoreWebView2.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.All);
                    LogToFile("Browsing data cleared during cleanup.");
                }
            }
            catch (Exception ex)
            {
                LogToFile($"Error clearing browsing data during cleanup: {ex.Message}");
            }
            finally
            {
                this.TopMost = false;
                Application.Exit();
                LogToFile("Application exiting.");
            }
        }

        private void LockdownForm_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.LControlKey || e.KeyCode == Keys.RControlKey) ctrlPressed = true;
            if (e.KeyCode == Keys.LMenu || e.KeyCode == Keys.RMenu) altPressed = true;
            if (e.KeyCode == Keys.LShiftKey || e.KeyCode == Keys.RShiftKey) shiftPressed = true;

            if (ctrlPressed && altPressed && shiftPressed && e.KeyCode == Keys.E)
            {
                var result = MessageBox.Show("Are you sure you want to perform an emergency exit?", "Confirm Exit", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (result == DialogResult.Yes)
                {
                    CleanupAndExit();
                }
            }
        }

        private void LockdownForm_KeyUp(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.LControlKey || e.KeyCode == Keys.RControlKey) ctrlPressed = false;
            if (e.KeyCode == Keys.LMenu || e.KeyCode == Keys.RMenu) altPressed = false;
            if (e.KeyCode == Keys.LShiftKey || e.KeyCode == Keys.RShiftKey) shiftPressed = false;
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            try
            {
                if (Directory.Exists(_userDataFolder))
                {
                    Directory.Delete(_userDataFolder, true);
                    LogToFile($"User data folder deleted: {_userDataFolder}");
                }
            }
            catch (Exception ex)
            {
                LogToFile($"Error deleting user data folder: {ex.Message}");
            }

            if (e.CloseReason == CloseReason.UserClosing && this.TopMost == true)
            {
                e.Cancel = true; // prevent Alt+F4
            }
            else
            {
                base.OnFormClosing(e);
            }
        }

        private void LogToFile(string message)
        {
            try
            {
                File.AppendAllText("rushless_log.txt", DateTime.Now + " | " + message + Environment.NewLine);
            }
            catch { }
        }
    }
}
