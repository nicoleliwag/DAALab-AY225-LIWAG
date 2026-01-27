# Sorting Algorithms Laboratory Project

## 📋 Overview
This repository contains two comprehensive Python programs for analyzing and comparing various sorting algorithms, developed as part of the Design and Analysis of Algorithms course.

## 🗂️ Project Structure
```
.
├── PRELIM-LAB-WORK-1/
│   ├── data.txt                    # Dataset (10,000 integers)
│   └── laboratory1.py              # Bubble Sort Implementation
├── PRELIM-LAB-WORK-2/
│   ├── data.txt                    # Dataset (10,000 integers)
│   └── sorting_algorithms.py      # Multi-Algorithm Comparison
└── README.md
```

---

## 📁 Laboratory 1: Bubble Sort Implementation

### Description
Implementation of the classic Bubble Sort algorithm with comprehensive testing and analysis on a dataset of 10,000 integers.

### Features
- ✅ Classic Bubble Sort with optimization (early termination)
- ✅ Dataset generation (random integers)
- ✅ Auto-search for `data.txt` in project folders
- ✅ Execution time measurement (seconds & milliseconds)
- ✅ Sorting verification system
- ✅ Dataset statistics and analysis
- ✅ Save/load functionality for datasets

### Implementation Requirements Met
1. **Dataset**: 10,000 integers in random order
2. **Algorithm**: Classic Bubble Sort (O(n²) time complexity)
3. **Metrics**: 
   - Complete sorted array output
   - Execution time in seconds and milliseconds
   - Verification of correctness
4. **Language**: Python 3.x

### Usage
```bash
cd PRELIM-LAB-WORK-1
python laboratory1.py
```

### Menu Options
1. Generate new random dataset (10,000 integers)
2. Auto-search and load data.txt
3. Load dataset from custom file path
4. Run Bubble Sort on current dataset
5. View dataset statistics
6. Save current dataset to file
7. Exit

### Performance
- **Time Complexity**: O(n²) worst case, O(n) best case (optimized)
- **Space Complexity**: O(1)
- **Tested on**: 10,000 random integers

---

## 📁 Laboratory 2: Sorting Algorithms Comparison

### Description
A comprehensive menu-driven program that implements and compares three fundamental sorting algorithms: Bubble Sort, Insertion Sort, and Merge Sort. All algorithms sort in **descending order** and include auto-detection of data files from the project structure.

### Features
- ✅ Three sorting algorithms implemented:
  - **Bubble Sort** - O(n²) with early termination optimization
  - **Insertion Sort** - O(n²) comparison-based sorting
  - **Merge Sort** - O(n log n) divide-and-conquer approach
- ✅ **Descending order sorting** for all algorithms
- ✅ Performance comparison mode (runs all three and shows results)
- ✅ Auto-search for `data.txt` in PRELIM-LAB-WORK folders
- ✅ Multiple dataset input options:
  - Manual input (comma-separated values)
  - File loading with custom paths
  - Random number generation
- ✅ Execution time measurement (seconds & milliseconds)
- ✅ Complete sorted array display with verification
- ✅ Dataset statistics and management

### File: laboratory2.py

### Usage
```bash
cd PRELIM-LAB-WORK-2
python laboratory2.py
```

### Menu Options
1. **Bubble Sort** - Run bubble sort on current dataset
2. **Insertion Sort** - Run insertion sort on current dataset
3. **Merge Sort** - Run merge sort on current dataset
4. **Compare All Algorithms** - Execute all three and display performance comparison
5. **Load New Dataset** - Change the current dataset
6. **Exit** - Close the program

### Data Source Selection
When starting the program, you can choose:
1. **Auto-search for data.txt** - Automatically finds data.txt in:
   - Current directory
   - PRELIM-LAB-WORK-1 folder
   - PRELIM-LAB-WORK-2 folder
   - Parent directory paths
   - All subdirectories (recursive search)
2. **Use custom dataset** - Enter data manually, from file, or generate random

### Algorithm Details

#### Bubble Sort
- **Implementation**: Exchange sort with optimization flag
- **Time Complexity**: O(n²) worst/average, O(n) best case
- **Space Complexity**: O(1)
- **Best for**: Small datasets, nearly sorted data
- **Feature**: Early termination when no swaps occur

#### Insertion Sort
- **Implementation**: Builds sorted array one element at a time
- **Time Complexity**: O(n²) worst/average, O(n) best case
- **Space Complexity**: O(1)
- **Best for**: Small datasets, online sorting (data arrives in real-time)
- **Feature**: Efficient for nearly sorted data

#### Merge Sort
- **Implementation**: Divide-and-conquer with recursive merging
- **Time Complexity**: O(n log n) in all cases
- **Space Complexity**: O(n)
- **Best for**: Large datasets, guaranteed O(n log n) performance
- **Feature**: Stable sort, predictable performance

### Algorithm Comparison Table
| Algorithm | Time Complexity (Worst) | Time Complexity (Best) | Space Complexity | Stable | In-Place |
|-----------|------------------------|----------------------|------------------|---------|----------|
| Bubble Sort | O(n²) | O(n) | O(1) | Yes | Yes |
| Insertion Sort | O(n²) | O(n) | O(1) | Yes | Yes |
| Merge Sort | O(n log n) | O(n log n) | O(n) | Yes | No |

### Sample Output
```
============================================================
COMPARING ALL SORTING ALGORITHMS
============================================================

Executing Bubble Sort...
  ✓ Completed in 8.234567 seconds (8234.567 ms)

Executing Insertion Sort...
  ✓ Completed in 4.123456 seconds (4123.456 ms)

Executing Merge Sort...
  ✓ Completed in 0.045678 seconds (45.678 ms)

============================================================
PERFORMANCE COMPARISON
============================================================
Algorithm            Time (seconds)       Time (ms)      
------------------------------------------------------------
Bubble Sort          8.234567             8234.567       
Insertion Sort       4.123456             4123.456       
Merge Sort           0.045678             45.678         
============================================================

Fastest Algorithm: Merge Sort (0.045678 seconds)
============================================================
```

### Custom Dataset Options

#### Option 1: Manual Input
```
Enter numbers separated by commas:
Numbers: 10, 5, 8, 3, 1, 9, 2, 7, 6, 4
✓ Successfully loaded 10 numbers
```

#### Option 2: File Loading
```
Enter the full path or filename:
Path: PRELIM-LAB-WORK-1/data.txt
✓ Successfully loaded 10000 numbers from PRELIM-LAB-WORK-1/data.txt
```

#### Option 3: Random Generation
```
Enter the number of elements to generate: 1000
Enter minimum value: 1
Enter maximum value: 10000
✓ Successfully generated 1000 random numbers
```

### Performance Testing
The program has been tested with:
- **Small datasets**: 10-100 elements
- **Medium datasets**: 1,000-5,000 elements
- **Large datasets**: 10,000+ elements

**Recommendation**: For datasets larger than 5,000 elements, Merge Sort significantly outperforms Bubble Sort and Insertion Sort.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.6 or higher
- No external libraries required (uses only standard library)

### Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Verify Python installation:
```bash
python --version
```

### Running the Programs

#### Option 1: Run Laboratory 1
```bash
cd PRELIM-LAB-WORK-1
python laboratory1.py
```

#### Option 2: Run Laboratory 2
```bash
cd PRELIM-LAB-WORK-2
python sorting_algorithms.py
```

---

## 📊 Data Format

### data.txt Structure
The `data.txt` file contains integers, one per line:
```
9999
9998
9997
...
3
2
1
```

### Custom Dataset Options
Both programs support:
- **Auto-detection**: Automatically finds `data.txt` in project folders
- **Manual input**: Enter comma-separated integers
- **File loading**: Load from any custom file path
- **Random generation**: Generate datasets with specified size and range

---

## 🧪 Testing

### Laboratory 1 Testing
```bash
# Generate random dataset
Choose option 1 → Enter size (e.g., 10000)

# Load existing data
Choose option 2 → Auto-searches for data.txt

# Run sorting
Choose option 4 → View results and execution time
```

### Laboratory 2 Testing
```bash
# Compare all algorithms
Choose option 1 → Auto-search for data.txt
Choose option 4 → See performance comparison

# Test individual algorithms
Choose options 1-3 for specific algorithms
```

---

## 📈 Performance Results

### Sample Output (10,000 integers)
```
BUBBLE SORT RESULTS
====================================================================
Array size: 10000 elements
Execution time: 8.234567 seconds
Execution time: 8234.567 milliseconds
Sorting verification: ✓ PASSED
====================================================================
```

---

## 🛠️ Technical Details

### Environment
- **Language**: Python 3.x
- **Standard Libraries Used**:
  - `time` - Execution time measurement
  - `random` - Random dataset generation
  - `os` - File system operations

### Code Structure
Both programs follow clean coding principles:
- Well-documented functions with docstrings
- Modular design for easy maintenance
- Error handling for file operations
- Input validation for user entries

---

## 📝 Implementation Notes

### Bubble Sort (Laboratory 1)
- Implements optimized version with early termination
- Swaps adjacent elements if out of order
- Stops if no swaps occur in a complete pass

### Sorting Algorithms (Laboratory 2)
- **Bubble Sort**: Exchange sort with optimization flag
- **Insertion Sort**: Builds sorted array one element at a time
- **Merge Sort**: Divide-and-conquer approach with merging

---

## 🐛 Troubleshooting

### Issue: "data.txt not found"
**Solution**: Use auto-search option (Option 2) or enter full path
```bash
# Example paths:
PRELIM-LAB-WORK-1/data.txt
C:/path/to/PRELIM-LAB-WORK-1/data.txt
```

### Issue: Large dataset performance
**Solution**: Use Merge Sort for datasets > 5,000 elements (O(n log n))

### Issue: File encoding errors
**Solution**: Ensure `data.txt` uses UTF-8 encoding

## 📄 License
This project is created for educational purposes as part of coursework requirements.

