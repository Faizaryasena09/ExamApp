using System;
using System.Windows.Forms;

namespace RushlessSafer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Make url nullable
            string? url = args.Length > 0 ? args[0] : null;

            // Pass empty string if url is null
            Application.Run(new Form1(url ?? ""));
        }
    }
}