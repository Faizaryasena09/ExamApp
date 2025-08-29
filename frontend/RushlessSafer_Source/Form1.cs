using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.Drawing;
using System.Net;
using System.Windows.Forms;

namespace RushlessSafer
{
    public partial class Form1 : Form
    {
        private WebView2 webView = null!;
        private string initialUrl;

        // This is for the emergency exit shortcut
        private bool ctrlPressed = false;
        private bool altPressed = false;
        private bool shiftPressed = false;

        public Form1(string url)
        {
            InitializeComponent();
            this.initialUrl = url;

            // Configure the form to be a borderless, maximized, topmost window
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;

            // Initialize WebView2
            InitializeWebView();

            // Set up keyboard hooks for emergency exit
            this.KeyPreview = true;
            this.KeyDown += new KeyEventHandler(LockdownForm_KeyDown);
            this.KeyUp += new KeyEventHandler(LockdownForm_KeyUp);
        }

        private async void InitializeWebView()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            this.Controls.Add(webView);

            // Initialize the WebView2 environment
            await webView.EnsureCoreWebView2Async(null);

            // Listen for messages from JavaScript (for the UNLOCK command)
            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

            // Navigate to the exam URL
            if (!string.IsNullOrEmpty(initialUrl) && initialUrl.StartsWith("exam-lock:"))
            {
                string actualUrl = initialUrl.Substring("exam-lock:".Length);
                
                actualUrl = WebUtility.UrlDecode(actualUrl);

                if (actualUrl.StartsWith("//"))
                {
                    actualUrl = actualUrl.Substring(2);
                }
                
                if (!actualUrl.StartsWith("http://") && !actualUrl.StartsWith("https://"))
                {
                    actualUrl = "http://" + actualUrl;
                }

                webView.CoreWebView2.Navigate(actualUrl);
            }
            else
            {
                // Fallback if no URL is provided
                webView.CoreWebView2.NavigateToString("<h1>Error: Exam URL not provided.</h1><p>Please launch the exam from your course page.</p>");
            }
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            string message = args.TryGetWebMessageAsString();
            if (message != null && message.StartsWith("UNLOCK"))
            {
                this.TopMost = false;
                Application.Exit();
            }
        }

        // --- Emergency Exit Shortcut Logic ---

        private void LockdownForm_KeyDown(object? sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.LControlKey || e.KeyCode == Keys.RControlKey) ctrlPressed = true;
            if (e.KeyCode == Keys.LMenu || e.KeyCode == Keys.RMenu) altPressed = true;
            if (e.KeyCode == Keys.LShiftKey || e.KeyCode == Keys.RShiftKey) shiftPressed = true;

            if (ctrlPressed && altPressed && shiftPressed && e.KeyCode == Keys.E)
            {
                var result = MessageBox.Show("Are you sure you want to perform an emergency exit?", "Confirm Exit", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (result == DialogResult.Yes)
                {
                    Application.Exit();
                }
            }
        }

        private void LockdownForm_KeyUp(object? sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.LControlKey || e.KeyCode == Keys.RControlKey) ctrlPressed = false;
            if (e.KeyCode == Keys.LMenu || e.KeyCode == Keys.RMenu) altPressed = false;
            if (e.KeyCode == Keys.LShiftKey || e.KeyCode == Keys.RShiftKey) shiftPressed = false;
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing && this.TopMost == true)
            {
                e.Cancel = true;
            }
            else
            {
                base.OnFormClosing(e);
            }
        }
    }
}
