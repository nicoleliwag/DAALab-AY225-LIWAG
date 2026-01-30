# Sorting Algorithm Stress Test - Prelim Exam

## Project Overview
This project implements a comprehensive benchmarking tool for comparing the performance of three sorting algorithms: Bubble Sort, Insertion Sort, and Merge Sort. The tool processes large-scale datasets and measures execution time to demonstrate the practical differences between O(n²) and O(n log n) algorithms.

## Features
- **GUI Interface**: Built with Tkinter for intuitive user interaction
- **CSV Data Parsing**: Loads and processes structured data from CSV files
- **Multiple Sorting Algorithms**: 
  - Bubble Sort (O(n²))
  - Insertion Sort (O(n²))
  - Merge Sort (O(n log n))
- **Flexible Column Selection**: Sort by ID (integer), FirstName (string), or LastName (string)
- **Scalable Testing**: Test with variable dataset sizes (N rows)
- **Performance Tracking**: Real-time progress bar and execution time measurement
- **Result Verification**: Display top 10 sorted records
- **Export Functionality**: Save sorted results to CSV with metadata

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Required libraries: `tkinter` (usually included with Python)

### Running the Program
```bash
python sorting_benchmark.py
```

## Usage Instructions

1. **Load Data**: Click "Load CSV" and select the `generated_data.csv` file
2. **Configure Parameters**:
   - **Rows**: Specify number of rows to sort (e.g., 1000, 10000, 100000)
   - **Column**: Choose which column to sort by (ID, FirstName, LastName)
   - **Algorithm**: Select sorting algorithm (Bubble Sort, Insertion Sort, Merge Sort)
3. **Start Sorting**: Click "▶ Start" to begin the sorting process
4. **Monitor Progress**: Watch the progress bar and elapsed time
5. **View Results**: Check the first 10 sorted records in the table
6. **Export**: Save results using "⬇ Export CSV" button

## Algorithm Complexity Analysis

| Algorithm | Time Complexity | Space Complexity | Best For |
|-----------|----------------|------------------|----------|
| Bubble Sort | O(n²) | O(1) | Small datasets (<1000) |
| Insertion Sort | O(n²) | O(1) | Nearly sorted data |
| Merge Sort | O(n log n) | O(n) | Large datasets (>10000) |

## Benchmark Results

### Test Environment
- **Processor**: [Your CPU Model]
- **RAM**: [Your RAM Size]
- **Operating System**: [Your OS]
- **Python Version**: [Your Python Version]
- **Dataset**: generated_data.csv (100,000 records)

### Performance Benchmark Table

#### Sorting by ID (Integer Comparison)

| Algorithm | N = 1,000 | N = 10,000 | N = 100,000 |
|-----------|-----------|------------|-------------|
| Bubble Sort | 1.8982s | 48.6355s | 3487.0259s (58.12 min) |
| Insertion Sort | 1.8959s | 36.5972s | 1932.2068s (32.20 min) |
| Merge Sort | 0.3942s | 0.7143s | 5.6569s |

**Speed Improvement (Merge Sort vs Others at N=100,000):**
- Merge Sort is **616x faster** than Bubble Sort
- Merge Sort is **342x faster** than Insertion Sort

### Key Observations

1. **O(n²) vs O(n log n) Difference**:
   - At N=1,000: Merge Sort is ~5x faster than Bubble/Insertion Sort
   - At N=10,000: Merge Sort is ~50-68x faster than Bubble/Insertion Sort
   - At N=100,000: Merge Sort is **342-616x faster** - completing in 5.66 seconds vs 32-58 minutes!

2. **Algorithm Performance**:
   - **Bubble Sort**: Slowest for all dataset sizes. At 100,000 records, it takes nearly 1 hour (58 minutes)
   - **Insertion Sort**: ~45% faster than Bubble Sort, but still impractical for large datasets (32 minutes for 100,000 records)
   - **Merge Sort**: Scales exceptionally well. Even with 100x more data (1,000 → 100,000), execution time only increases by ~14x

3. **Practical Insights**:
   - Bubble Sort becomes impractical beyond 10,000 records (takes ~49 seconds)
   - Insertion Sort is more efficient than Bubble Sort but still has O(n²) limitations
   - Merge Sort maintains consistent performance scaling and is the only viable option for datasets over 10,000 records
   - The dramatic time difference (5.66 seconds vs 58 minutes) demonstrates why O(n log n) algorithms are essential for modern computing

4. **Scalability Analysis**:
   - When dataset size increases 10x (1,000 → 10,000):
     - Bubble Sort: ~26x slower (expected ~100x for pure O(n²))
     - Insertion Sort: ~19x slower
     - Merge Sort: ~1.8x slower (close to theoretical log n factor)
   - When dataset size increases 100x (1,000 → 100,000):
     - Bubble Sort: ~1,837x slower
     - Insertion Sort: ~1,019x slower
     - Merge Sort: ~14x slower (demonstrates O(n log n) efficiency)

## Repository Structure
```
.
├── README.md
├── sorting_benchmark.py
├── data/
│   └── generated_data.csv
└── results/
    └── [exported CSV files]
```

## Implementation Details

### Data Model
```python
@dataclass
class Record:
    id: int
    first_name: str
    last_name: str
```

### Key Features
- **Threading**: Sorting runs in background thread to prevent UI freezing
- **Pause/Resume**: Control execution flow during sorting
- **Stop Functionality**: Abort sorting operation at any time
- **Progress Tracking**: Real-time updates with progress bar
- **Error Handling**: Graceful handling of file loading and sorting errors

## Theoretical Context

This project demonstrates the fundamental importance of algorithm complexity in practical computing. The benchmark results provide concrete evidence of the dramatic performance differences between algorithm complexities:

- **Merge Sort (O(n log n))**: Completes 100,000 records in **5.66 seconds**
- **Insertion Sort (O(n²))**: Takes **1,932 seconds (32 minutes)** for the same dataset - **342x slower**
- **Bubble Sort (O(n²))**: Takes **3,487 seconds (58 minutes)** for the same dataset - **616x slower**

This exponential difference showcases why modern computing relies on efficient algorithms for handling large-scale data. The gap between O(n²) and O(n log n) grows exponentially as data size increases, making algorithm selection critical for real-world applications.

## Challenges & Solutions

1. **UI Freezing**: Solved by implementing threading and progress callbacks
2. **Large Dataset Performance**: Optimized merge sort with efficient progress tracking
3. **Memory Management**: Used generators and efficient data structures
4. **String Comparison**: Normalized to lowercase for consistent sorting

## Future Enhancements
- Add Quick Sort and Heap Sort algorithms
- Implement visualization of sorting process
- Add support for custom CSV formats
- Memory usage tracking
- Parallel sorting for multi-core systems

## Author
Nicole Anne G. Liwag
22-0222-285

## Submission Date
February 4, 2026

## Course Information
Design and Analysis of Algorithms Lab - Prelim Exam