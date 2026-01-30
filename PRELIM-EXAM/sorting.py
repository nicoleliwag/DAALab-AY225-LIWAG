import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv, time, threading
from dataclasses import dataclass
from typing import List


# ===================== DATA MODEL =====================
@dataclass
class Record:
    id: int
    first_name: str
    last_name: str


# ===================== SORTING ALGORITHMS =====================
class SortingAlgorithms:

    @staticmethod
    def bubble_sort(data, key, progress, pause_event, stop_event):
        arr = data.copy()
        n = len(arr)
        for i in range(n):
            if stop_event.is_set():
                return None
            pause_event.wait()
            for j in range(0, n - i - 1):
                if key(arr[j]) > key(arr[j + 1]):
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
            progress(i + 1, n)
        return arr

    @staticmethod
    def insertion_sort(data, key, progress, pause_event, stop_event):
        arr = data.copy()
        n = len(arr)
        for i in range(1, n):
            if stop_event.is_set():
                return None
            pause_event.wait()
            cur = arr[i]
            j = i - 1
            while j >= 0 and key(arr[j]) > key(cur):
                arr[j + 1] = arr[j]
                j -= 1
            arr[j + 1] = cur
            progress(i + 1, n)
        return arr

    @staticmethod
    def merge_sort(data, key, progress, pause_event, stop_event):
        total = len(data)
        completed = [0]  # Use list to allow modification in nested function
        update_interval = max(1, total // 100)  # Update progress bar 100 times
        
        def merge(left, right):
            result = []
            while left and right:
                pause_event.wait()
                if stop_event.is_set():
                    return []
                if key(left[0]) <= key(right[0]):
                    result.append(left.pop(0))
                else:
                    result.append(right.pop(0))
            result.extend(left)
            result.extend(right)
            return result

        def sort(arr):
            pause_event.wait()
            if stop_event.is_set():
                return []
            if len(arr) <= 1:
                completed[0] += len(arr)
                if completed[0] % update_interval == 0:
                    progress(completed[0], total)
                return arr
            mid = len(arr) // 2
            left_sorted = sort(arr[:mid])
            right_sorted = sort(arr[mid:])
            merged = merge(left_sorted, right_sorted)
            
            # Update progress after merge
            if len(merged) > 1:
                if completed[0] % update_interval == 0:
                    progress(completed[0], total)
            
            return merged

        result = sort(data.copy())
        progress(total, total)
        return result


# ===================== GUI =====================
class SortingBenchmarkGUI:

    def __init__(self, root):
        self.root = root
        self.root.title("Sorting Algorithm Stress Test")
        self.root.geometry("1000x760")

        self.data: List[Record] = []
        self.sorted_result: List[Record] = []
        self.loaded_file = None

        self.pause_event = threading.Event()
        self.pause_event.set()
        self.stop_event = threading.Event()

        self.start_time = None
        self.end_time = None

        self.setup_style()
        self.build_ui()

    # ---------- STYLE ----------
    def setup_style(self):
        style = ttk.Style()
        style.theme_use("clam")

        BG = "#f7f9fc"
        FG = "#1f2933"
        ACCENT = "#2563eb"
        BORDER = "#d1d5db"

        self.root.configure(bg=BG)

        style.configure(".", background=BG, foreground=FG, font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI Semibold", 17), foreground=ACCENT)
        style.configure("TButton", padding=(12, 6), background=ACCENT, foreground="white")
        style.map("TButton", background=[("active", "#1d4ed8")])
        style.configure("TProgressbar", thickness=12, troughcolor=BORDER, background=ACCENT)

    # ---------- UI ----------
    def build_ui(self):
        container = ttk.Frame(self.root, padding=20)
        container.pack(expand=True, fill="both")

        ttk.Label(
            container,
            text="Sorting Algorithm Stress Test – Benchmarking Tool",
            style="Title.TLabel"
        ).pack(pady=(0, 20))

        # Top controls
        controls = ttk.Frame(container)
        controls.pack()

        ttk.Button(controls, text="Load CSV", command=self.load_csv).grid(row=0, column=0, padx=6)

        ttk.Label(controls, text="Rows:").grid(row=0, column=1)
        self.rows_var = tk.StringVar(value="1000")
        ttk.Entry(controls, textvariable=self.rows_var, width=8).grid(row=0, column=2)

        ttk.Label(controls, text="Column:").grid(row=0, column=3)
        self.col_var = tk.StringVar(value="ID")
        ttk.Combobox(
            controls,
            textvariable=self.col_var,
            values=["ID", "FirstName", "LastName"],
            state="readonly",
            width=12
        ).grid(row=0, column=4)

        ttk.Label(controls, text="Algorithm:").grid(row=0, column=5)
        self.algo_var = tk.StringVar(value="Merge Sort")
        ttk.Combobox(
            controls,
            textvariable=self.algo_var,
            values=["Bubble Sort", "Insertion Sort", "Merge Sort"],
            state="readonly",
            width=14
        ).grid(row=0, column=6)

        # Action buttons
        action_buttons = ttk.Frame(container)
        action_buttons.pack(pady=12)

        ttk.Button(action_buttons, text="▶ Start", command=self.start_sort).grid(row=0, column=0, padx=6)
        ttk.Button(action_buttons, text="⏸ Pause", command=self.pause_sort).grid(row=0, column=1, padx=6)
        ttk.Button(action_buttons, text="⏹ Stop", command=self.stop_sort).grid(row=0, column=2, padx=6)

        self.progress = ttk.Progressbar(container, mode="determinate")
        self.progress.pack(fill="x", pady=(10, 5))

        self.status = ttk.Label(container, text="Ready")
        self.status.pack(anchor="w")

        self.file_label = ttk.Label(container, text="No file loaded", foreground="#6b7280")
        self.file_label.pack(anchor="w", pady=(2, 0))

        # Table
        self.tree = ttk.Treeview(
            container,
            columns=("Rank", "ID", "First Name", "Last Name"),
            show="headings",
            height=10
        )

        for col in ("Rank", "ID", "First Name", "Last Name"):
            self.tree.heading(col, text=col)
            self.tree.column(col, anchor="center", width=150)

        self.tree.pack(fill="both", expand=True, pady=15)

        # Bottom buttons (NEW)
        bottom_buttons = ttk.Frame(container)
        bottom_buttons.pack(pady=5)

        ttk.Button(bottom_buttons, text="🧹 Clear Results", command=self.clear_results).grid(row=0, column=0, padx=8)
        ttk.Button(bottom_buttons, text="⬇ Export CSV", command=self.export_csv).grid(row=0, column=1, padx=8)

    # ---------- LOGIC ----------
    def load_csv(self):
        path = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv")])
        if not path:
            return
        try:
            with open(path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.data = [
                    Record(int(r["ID"]), r["FirstName"], r["LastName"])
                    for r in reader
                ]
            import os
            self.loaded_file = os.path.basename(path)
            self.file_label.config(text=f"Loaded file: {self.loaded_file}")
            messagebox.showinfo("Loaded", f"{len(self.data):,} records loaded from:\n{self.loaded_file}")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def key_func(self):
        return {
            "ID": lambda r: r.id,
            "FirstName": lambda r: r.first_name.lower(),
            "LastName": lambda r: r.last_name.lower()
        }[self.col_var.get()]

    def update_progress(self, current, total):
        elapsed = time.time() - self.start_time
        percent = (current / total) * 100
        self.progress["value"] = percent
        self.status.config(
            text=f"Processing... {percent:.1f}% | Elapsed: {elapsed:.2f}s"
        )
        self.root.update_idletasks()

    def start_sort(self):
        if not self.data:
            messagebox.showwarning("No Data", "Load a CSV file first.")
            return

        self.clear_results()
        self.stop_event.clear()
        self.pause_event.set()

        self.start_time = time.time()
        self.end_time = None

        threading.Thread(target=self.run_sort, daemon=True).start()

    def pause_sort(self):
        if self.pause_event.is_set():
            self.pause_event.clear()
            self.status.config(text="Paused (time preserved)")
        else:
            self.pause_event.set()

    def stop_sort(self):
        self.stop_event.set()
        self.pause_event.set()
        self.status.config(text="Stopped")

    def run_sort(self):
        n = min(int(self.rows_var.get()), len(self.data))
        subset = self.data[:n]

        algo_map = {
            "Bubble Sort": SortingAlgorithms.bubble_sort,
            "Insertion Sort": SortingAlgorithms.insertion_sort,
            "Merge Sort": SortingAlgorithms.merge_sort
        }

        self.sorted_result = algo_map[self.algo_var.get()](
            subset,
            self.key_func(),
            self.update_progress,
            self.pause_event,
            self.stop_event
        )

        if self.sorted_result is None:
            return

        self.end_time = time.time()
        total_time = self.end_time - self.start_time

        for i, r in enumerate(self.sorted_result[:10], 1):
            self.tree.insert("", "end", values=(i, r.id, r.first_name, r.last_name))

        self.status.config(text=f"Completed | Total Time: {total_time:.4f}s")

        messagebox.showinfo(
            "Sorting Complete",
            f"{self.algo_var.get()} completed.\n\n"
            f"Records processed: {n:,}\n"
            f"Total execution time: {total_time:.4f} seconds"
        )

    # ---------- CLEAR ----------
    def clear_results(self):
        self.tree.delete(*self.tree.get_children())
        self.progress["value"] = 0
        self.status.config(text="Ready")
        self.sorted_result.clear()

    # ---------- EXPORT ----------
    def export_csv(self):
        if not self.sorted_result:
            messagebox.showwarning("No Data", "Nothing to export yet.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV Files", "*.csv")]
        )
        if not path:
            return

        total_time = self.end_time - self.start_time

        try:
            with open(path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "Rank", "ID", "First Name", "Last Name",
                    "Algorithm", "Sorted Column",
                    "Records Processed", "Execution Time (seconds)"
                ])

                for i, r in enumerate(self.sorted_result, 1):
                    writer.writerow([
                        i, r.id, r.first_name, r.last_name,
                        self.algo_var.get(),
                        self.col_var.get(),
                        len(self.sorted_result),
                        f"{total_time:.4f}"
                    ])

            messagebox.showinfo("Exported", "Results exported successfully.")
        except Exception as e:
            messagebox.showerror("Export Error", str(e))


# ===================== RUN =====================
if __name__ == "__main__":
    root = tk.Tk()
    SortingBenchmarkGUI(root)
    root.mainloop()