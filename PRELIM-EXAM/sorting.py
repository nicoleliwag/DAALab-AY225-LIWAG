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
    def bubble_sort(data, key, progress=None):
        arr = data.copy()
        n = len(arr)
        for i in range(n):
            for j in range(0, n - i - 1):
                if key(arr[j]) > key(arr[j + 1]):
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
            if progress:
                progress(i + 1, n)
        return arr

    @staticmethod
    def insertion_sort(data, key, progress=None):
        arr = data.copy()
        n = len(arr)
        for i in range(1, n):
            cur = arr[i]
            j = i - 1
            while j >= 0 and key(arr[j]) > key(cur):
                arr[j + 1] = arr[j]
                j -= 1
            arr[j + 1] = cur
            if progress:
                progress(i + 1, n)
        return arr

    @staticmethod
    def merge_sort(data, key, progress=None):
        def merge(left, right):
            result = []
            i = j = 0
            while i < len(left) and j < len(right):
                if key(left[i]) <= key(right[j]):
                    result.append(left[i]); i += 1
                else:
                    result.append(right[j]); j += 1
            result.extend(left[i:])
            result.extend(right[j:])
            return result

        def sort(arr):
            if len(arr) <= 1:
                return arr
            mid = len(arr) // 2
            return merge(sort(arr[:mid]), sort(arr[mid:]))

        result = sort(data.copy())
        if progress:
            progress(len(result), len(result))
        return result


# ===================== GUI =====================
class SortingBenchmarkGUI:

    def __init__(self, root):
        self.root = root
        self.root.title("Sorting Algorithm Stress Test")
        self.root.geometry("1000x700")

        self.data: List[Record] = []

        self.build_ui()

    # ---------- UI ----------
    def build_ui(self):
        container = ttk.Frame(self.root, padding=20)
        container.pack(expand=True, fill="both")

        title = ttk.Label(
            container,
            text="Sorting Algorithm Stress Test – Benchmarking Tool",
            font=("Segoe UI", 16, "bold")
        )
        title.pack(pady=(0, 15))

        # Controls
        controls = ttk.Frame(container)
        controls.pack(pady=10)

        ttk.Button(controls, text="Load CSV", command=self.load_csv).grid(row=0, column=0, padx=5)

        ttk.Label(controls, text="Rows:").grid(row=0, column=1, padx=5)
        self.rows_var = tk.StringVar(value="1000")
        ttk.Entry(controls, textvariable=self.rows_var, width=8).grid(row=0, column=2)

        ttk.Label(controls, text="Column:").grid(row=0, column=3, padx=5)
        self.col_var = tk.StringVar(value="ID")
        ttk.Combobox(
            controls,
            textvariable=self.col_var,
            values=["ID", "FirstName", "LastName"],
            state="readonly",
            width=12
        ).grid(row=0, column=4)

        ttk.Label(controls, text="Algorithm:").grid(row=0, column=5, padx=5)
        self.algo_var = tk.StringVar(value="Merge Sort")
        ttk.Combobox(
            controls,
            textvariable=self.algo_var,
            values=["Bubble Sort", "Insertion Sort", "Merge Sort"],
            state="readonly",
            width=14
        ).grid(row=0, column=6)

        ttk.Button(controls, text="Start Sorting", command=self.start_sort).grid(row=0, column=7, padx=10)

        # Progress
        self.progress = ttk.Progressbar(container, mode="determinate")
        self.progress.pack(fill="x", pady=(10, 5))

        self.status = ttk.Label(container, text="Ready")
        self.status.pack(anchor="w")

        # Table
        table_frame = ttk.Frame(container)
        table_frame.pack(fill="both", expand=True, pady=15)

        columns = ("Rank", "ID", "First Name", "Last Name")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings")

        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, anchor="center")

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

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
            messagebox.showinfo("Loaded", f"{len(self.data):,} records loaded.")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def key_func(self):
        return {
            "ID": lambda r: r.id,
            "FirstName": lambda r: r.first_name.lower(),
            "LastName": lambda r: r.last_name.lower()
        }[self.col_var.get()]

    def update_progress(self, current, total):
        percent = (current / total) * 100
        self.progress["value"] = percent
        self.status.config(text=f"Processing... {percent:.1f}%")
        self.root.update_idletasks()

    def start_sort(self):
        if not self.data:
            messagebox.showwarning("No Data", "Load a CSV file first.")
            return

        self.tree.delete(*self.tree.get_children())
        self.progress["value"] = 0

        threading.Thread(target=self.run_sort, daemon=True).start()

    def run_sort(self):
        n = min(int(self.rows_var.get()), len(self.data))
        subset = self.data[:n]
        key = self.key_func()

        algo_map = {
            "Bubble Sort": SortingAlgorithms.bubble_sort,
            "Insertion Sort": SortingAlgorithms.insertion_sort,
            "Merge Sort": SortingAlgorithms.merge_sort
        }

        algo_name = self.algo_var.get()
        algo_func = algo_map[algo_name]

        self.status.config(text=f"Running {algo_name}...")
        start = time.time()
        result = algo_func(subset, key, self.update_progress)
        elapsed = time.time() - start

        for i, r in enumerate(result[:10], start=1):
            self.tree.insert("", "end", values=(i, r.id, r.first_name, r.last_name))

        self.status.config(text=f"{algo_name} completed in {elapsed:.4f} seconds")

        # ✅ POP-UP MESSAGE WHEN DONE
        self.root.after(0, lambda: messagebox.showinfo(
            "Sorting Complete",
            f"{algo_name} has finished sorting.\n\n"
            f"Records processed: {n:,}\n"
            f"Time elapsed: {elapsed:.4f} seconds"
        ))


# ===================== RUN =====================
if __name__ == "__main__":
    root = tk.Tk()
    SortingBenchmarkGUI(root)
    root.mainloop()
