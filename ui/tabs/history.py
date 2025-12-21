
import customtkinter
import datetime
from tkinter import messagebox

class HistoryTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(1, weight=1)
        
        controls_frame = customtkinter.CTkFrame(self.tab)
        controls_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        
        yesterday = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        
        customtkinter.CTkLabel(controls_frame, text="Start Date:").pack(side="left", padx=10)
        self.history_start_date = customtkinter.CTkEntry(controls_frame)
        self.history_start_date.insert(0, yesterday)
        self.history_start_date.pack(side="left", padx=5)
        
        customtkinter.CTkLabel(controls_frame, text="End Date:").pack(side="left", padx=10)
        self.history_end_date = customtkinter.CTkEntry(controls_frame)
        self.history_end_date.insert(0, self.app.current_date)
        self.history_end_date.pack(side="left", padx=5)
        
        self.show_history_btn = customtkinter.CTkButton(controls_frame, text="Show History", command=self.show_history)
        self.show_history_btn.pack(side="left", padx=20)
        
        self.history_textbox = customtkinter.CTkTextbox(self.tab, state="disabled", wrap="none", font=("Courier", 12))
        self.history_textbox.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

    def show_history(self):
        start = self.history_start_date.get()
        end = self.history_end_date.get()
        try:
            stats = self.app.db.get_date_range_stats(start, end)
            self.history_textbox.configure(state="normal")
            self.history_textbox.delete("1.0", "end")
            
            if not stats:
                self.history_textbox.insert("1.0", "No data found for the selected date range.")
            else:
                header = f"{'Date':<12} | {'Calories':>10} | {'Protein (g)':>12} | {'Fat (g)':>10} | {'Carbs (g)':>10}\n"
                separator = "-" * len(header) + "\n"
                self.history_textbox.insert("1.0", header + separator)
                for row in stats:
                    line = f"{row[0]:<12} | {row[1]:>10.0f} | {row[2]:>12.1f} | {row[3]:>10.1f} | {row[4]:>10.1f}\n"
                    self.history_textbox.insert("end", line)
            self.history_textbox.configure(state="disabled")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to fetch history. Check date format (YYYY-MM-DD). Error: {e}")
