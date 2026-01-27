# DAALab-AY225
The DAA-Lab Repo
# Laboratory 2: Sorting Algorithms

## 📋 Project Overview

This is a **console-based Python application** that implements and compares three classic sorting algorithms: Bubble Sort, Insertion Sort, and Merge Sort. All algorithms are configured to sort data in descending order, and the program provides comprehensive performance analysis and timing comparisons.

## 🖥️ Console-Based Interface

This program runs entirely in the **command-line interface (CLI)**. All interactions, including data input, algorithm selection, and results display, are performed through text-based menus and prompts in the console/terminal.

## ✨ Features

### Sorting Algorithms Implemented
1. **Bubble Sort** - Time Complexity: O(n²)
2. **Insertion Sort** - Time Complexity: O(n²)
3. **Merge Sort** - Time Complexity: O(n log n)

### Core Functionality
- ✅ Sort arrays in **descending order**
- ⏱️ Measure and display execution time for each algorithm
- 📊 Compare performance of all three algorithms simultaneously
- 🔄 Multiple data input methods
- ✔️ Result verification with min/max values

## 📥 Data Input Methods

The program supports **four flexible ways** to load data:

1. **Default File** - Load from `data.txt` (one number per line)
2. **Manual Entry** - Enter comma-separated numbers directly
3. **Custom File** - Specify your own text file
4. **Random Generation** - Generate random datasets with custom size and value range

## 🚀 How to Run

### Prerequisites
- Python 3.x installed on your system

### Execution Steps

1. **Prepare your data file** (optional):
   ```
   Create a file named data.txt with one integer per line:
   42
   15
   88
   3
   67
   ```

2. **Run the program**:
   ```bash
   python sorting_algorithms.py
   ```

3. **Follow the console prompts**:
   - Choose your data source
   - Select sorting algorithm or comparison mode
   - View results in the terminal

## 📖 Usage Guide

### Main Menu Options

```
1. Bubble Sort        - Sort using bubble sort algorithm
2. Insertion Sort     - Sort using insertion sort algorithm
3. Merge Sort         - Sort using merge sort algorithm
4. Compare All        - Run all algorithms and compare performance
5. Load New Dataset   - Change the current dataset
6. Exit               - Close the program
```

### Example Console Session

```
==============================================================
SORTING ALGORITHMS PROGRAM
==============================================================

DATA SOURCE SELECTION
1. Load from data.txt (default)
2. Use custom dataset

Enter your choice (1-2): 1

✓ Successfully loaded 100 numbers

==============================================================
SORTING ALGORITHMS - DESCENDING ORDER
==============================================================
1. Bubble Sort
2. Insertion Sort
3. Merge Sort
4. Compare All Algorithms
5. Load New Dataset
6. Exit

Enter your choice (1-6): 3

Executing Merge Sort...

==============================================================
Algorithm: Merge Sort
==============================================================

Sorted array (Descending Order):
[95, 94, 93, 92, 91, ...]

Time spent: 0.000523 seconds
Time spent: 0.523 milliseconds
==============================================================
```

## 📊 Output Information

Each sorting operation displays:
- ✅ Sorted array (full or truncated for large datasets)
- ⏱️ Execution time in seconds and milliseconds
- 📈 Array size verification
- 🔝 Maximum value (first element)
- 🔽 Minimum value (last element)

## 🔬 Performance Comparison

The **Compare All Algorithms** feature runs all three sorting algorithms on the same dataset and provides:
- Individual execution times
- Side-by-side performance comparison table
- Identification of the fastest algorithm

## 📁 File Structure

```
Laboratory-2/
│
├── sorting_algorithms.py    # Main program file
├── data.txt                  # Default data file (optional)
└── README.md                 # This documentation
```

## 🛠️ Technical Details

### Algorithm Implementations

- **Non-destructive**: All sorting functions create copies of the input array
- **Optimized Bubble Sort**: Includes early termination when no swaps occur
- **Stable Merge Sort**: Maintains relative order of equal elements
- **Efficient Insertion Sort**: Uses while loop for proper element placement

### Time Complexity Summary

| Algorithm      | Best Case  | Average Case | Worst Case |
|---------------|------------|--------------|------------|
| Bubble Sort   | O(n)       | O(n²)        | O(n²)      |
| Insertion Sort| O(n)       | O(n²)        | O(n²)      |
| Merge Sort    | O(n log n) | O(n log n)   | O(n log n) |

## ⚠️ Error Handling

The program includes robust error handling for:
- Missing or invalid data files
- Invalid user input
- Empty datasets
- Non-integer values
- Invalid file formats

## 💡 Tips for Best Results

1. **Small datasets** (< 1000 elements): All algorithms perform reasonably well
2. **Medium datasets** (1000-10000): Merge Sort shows clear advantages
3. **Large datasets** (> 10000): Merge Sort significantly outperforms others
4. **Nearly sorted data**: Insertion Sort may perform surprisingly well

## 🎯 Educational Purpose

This laboratory exercise demonstrates:
- Implementation of fundamental sorting algorithms
- Algorithm performance analysis
- Time complexity concepts
- Console-based program design
- User input validation
- Modular code organization

## 📝 Notes

- All sorting operations are performed in **descending order** (highest to lowest)
- The program is **purely console-based** - no GUI required
- Original data is preserved; sorting operations work on copies
- Large datasets (> 50 elements) show truncated output for readability

## 👨‍💻 Author

Laboratory 2 - Sorting Algorithms Implementation

---

**Platform**: Console/Terminal Application  
**Language**: Python 3.x  
**Type**: Educational/Academic Project