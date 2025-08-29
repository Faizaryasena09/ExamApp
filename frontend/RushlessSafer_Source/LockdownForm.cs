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
                    await webView.EnsureCoreWebView2Async(null);
                    webView.CoreWebView2.NavigateToString("<h1>Error: Invalid exam URL.</h1><p>Please launch the exam from your course page.</p>");
                    return;
                }

                // Create a unique, temporary folder for this session
                _userDataFolder = Path.Combine(Path.GetTempPath(), "RushlessSafer_" + Guid.NewGuid().ToString());
                Directory.CreateDirectory(_userDataFolder);

                string decodedUrl = WebUtility.UrlDecode(initialUrl.Substring("exam-lock:".Length));
                if (decodedUrl.StartsWith("//"))
                {
                    decodedUrl = decodedUrl.Substring(2);
                }

                Uri uri = new Uri(decodedUrl);
                NameValueCollection query = HttpUtility.ParseQueryString(uri.Query);

                _authToken = query["token"];
                string userAgent = query["userAgent"];

                string navigationUrl = uri.GetLeftPart(UriPartial.Path);

                var options = new CoreWebView2EnvironmentOptions();
                if (!string.IsNullOrEmpty(userAgent))
                {
                    options.AdditionalBrowserArguments = $"--user-agent=\"{userAgent}\" ";
                }

                var environment = await CoreWebView2Environment.CreateAsync(null, _userDataFolder, options);
                await webView.EnsureCoreWebView2Async(environment);

                // Set Cookies
                if (!string.IsNullOrEmpty(_cookies))
                {
                    string[] cookiePairs = _cookies.Split(';');
                    foreach (string cookiePair in cookiePairs) 
                    {
                        string[] cookieParts = cookiePair.Trim().Split('=');
                        if (cookieParts.Length == 2)
                        {
                            var cookie = webView.CoreWebView2.CookieManager.CreateCookie(cookieParts[0], cookieParts[1], uri.Host, "/");
                            webView.CoreWebView2.CookieManager.AddOrUpdateCookie(cookie);
                        }
                    }
                }

                webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
                webView.CoreWebView2.WebResourceRequested += CoreWebView2_WebResourceRequested;

                webView.CoreWebView2.Navigate(navigationUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"An error occurred: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                CleanupAndExit();
            }
        }

        private void CoreWebView2_WebResourceRequested(object sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            if (!string.IsNullOrEmpty(_authToken))
            {
                e.Request.Headers.SetHeader("Authorization", "Bearer " + _authToken);
            }
        }

        private void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            string message = args.TryGetWebMessageAsString();
            if (message != null && message.StartsWith("UNLOCK"))
            {
                CleanupAndExit();
            }
        }

        private async void CleanupAndExit()
        {
            try
            {
                if (webView != null && webView.CoreWebView2 != null)
                {
                    await webView.CoreWebView2.ClearBrowsingDataAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error clearing browsing data: " + ex.Message);
            }
            finally
            {
                this.TopMost = false;
                Application.Exit();
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
            // This is the final cleanup point.
            // It runs when Application.Exit() is called.
            try
            {
                if (Directory.Exists(_userDataFolder))
                {
                    Directory.Delete(_userDataFolder, true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error deleting user data folder: " + ex.Message);
            }

            if (e.CloseReason == CloseReason.UserClosing && this.TopMost == true)
            {
                e.Cancel = true; // Prevent closing via Alt+F4 unless unlocked
            }
            else
            {
                base.OnFormClosing(e);
            }
        }
    }
}