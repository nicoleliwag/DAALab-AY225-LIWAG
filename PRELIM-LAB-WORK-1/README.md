# DAALab-AY225
The DAA-Lab Repo
# Laboratory 1: Bubble Sort Algorithm

## 📋 Project Overview

This is a **console-based Python application** that implements the classic Bubble Sort algorithm. The program demonstrates fundamental sorting concepts and includes performance timing to measure execution efficiency. All output is displayed directly in the terminal/command-line interface.

## 🖥️ Console-Based Interface

This program runs entirely in the **command-line interface (CLI)**. The program executes predefined test cases and displays all results—including original arrays, sorted arrays, and execution times—directly in the console/terminal window.

## ✨ Features

### Core Functionality
- ✅ **Bubble Sort Implementation** - Classic sorting algorithm with optimization
- ⏱️ **Performance Timing** - Measures and displays execution time for each sort
- 🔄 **Multiple Test Cases** - Includes various array scenarios
- 📊 **Detailed Output** - Shows before/after comparison for each test

### Algorithm Optimization
- **Early Termination** - Stops if the array is already sorted
- **Swap Detection** - Uses a flag to detect when no more swaps are needed
- **Efficient Iteration** - Skips already-sorted elements at the end

## 🎓 Algorithm Details

### Bubble Sort
**Bubble Sort** is a simple comparison-based sorting algorithm that repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.

### How It Works
1. Compare adjacent elements in the array
2. Swap them if they are in the wrong order (larger before smaller)
3. Repeat this process for all elements
4. After each pass, the largest unsorted element "bubbles up" to its correct position
5. Continue until no more swaps are needed

### Time Complexity
- **Best Case**: O(n) - when array is already sorted
- **Average Case**: O(n²) - typical random data
- **Worst Case**: O(n²) - when array is reverse sorted
- **Space Complexity**: O(1) - sorts in-place

## 🚀 How to Run

### Prerequisites
- Python 3.x installed on your system

### Execution Steps

1. **Save the program**:
   - Save the code as `bubble_sort.py`

2. **Run the program** in terminal/command prompt:
   ```bash
   python bubble_sort.py
   ```

3. **View results** in the console:
   - The program will automatically run all test cases
   - Results are displayed directly in the terminal

## 📖 Test Cases

The program includes **four predefined test cases**:

1. **Random Array**: `[64, 34, 25, 12, 22, 11, 90]`
2. **Small Array**: `[5, 1, 4, 2, 8]`
3. **Already Sorted**: `[1, 2, 3, 4, 5]`
4. **Reverse Sorted**: `[5, 4, 3, 2, 1]`

These test cases demonstrate different scenarios and help analyze algorithm performance.

## 📊 Example Console Output

```
Original: [64, 34, 25, 12, 22, 11, 90]
Sorted:   [11, 12, 22, 25, 34, 64, 90]
Time:     0.000012 seconds

Original: [5, 1, 4, 2, 8]
Sorted:   [1, 2, 4, 5, 8]
Time:     0.000008 seconds

Original: [1, 2, 3, 4, 5]
Sorted:   [1, 2, 3, 4, 5]
Time:     0.000003 seconds

Original: [5, 4, 3, 2, 1]
Sorted:   [1, 2, 3, 4, 5]
Time:     0.000010 seconds
```

## 🔬 Understanding the Results

### Performance Observations

- **Already Sorted Array**: Shows fastest execution time due to early termination optimization
- **Reverse Sorted Array**: Takes longer as it requires maximum number of swaps
- **Random Arrays**: Execution time varies based on initial order

### Time Measurements

The program displays execution time in seconds with microsecond precision (6 decimal places), allowing you to observe:
- Algorithm efficiency on different data patterns
- Impact of optimization (early termination)
- Performance scalability with array size

## 🛠️ Technical Implementation

### Key Components

```python
def bubble_sort(arr):
    """Sorts array using bubble sort with optimization"""
    - Implements nested loops for comparison
    - Uses swapped flag for early termination
    - Returns both sorted array and execution time
```

### Optimization Details

1. **Swapped Flag**: Detects if any swaps occurred in a pass
2. **Early Exit**: Breaks out of loop if no swaps (array is sorted)
3. **Range Reduction**: Each pass reduces the comparison range

### Function Design

- **Input**: List of comparable elements
- **Output**: Tuple containing (sorted list, execution time)
- **Non-destructive**: Uses `.copy()` to preserve original array

## 💡 Modifying the Program

### Adding Custom Test Cases

You can easily add your own test arrays:

```python
test_arrays = [
    [64, 34, 25, 12, 22, 11, 90],  # Existing
    [100, 50, 25, 75, 10],         # Your custom array
    [9, 7, 5, 3, 1],               # Another test case
]
```

### Testing with User Input

To accept user input from the console:

```python
# Add this code before the main loop
user_input = input("Enter numbers separated by spaces: ")
user_array = [int(x) for x in user_input.split()]
test_arrays.append(user_array)
```

## 📁 File Structure

```
Laboratory-1/
│
├── bubble_sort.py    # Main program file
└── README.md         # This documentation
```

## 🎯 Educational Purpose

This laboratory exercise demonstrates:

- ✅ Implementation of a fundamental sorting algorithm
- ✅ Algorithm optimization techniques
- ✅ Performance measurement and analysis
- ✅ Time complexity concepts in practice
- ✅ Python function design and documentation
- ✅ Console-based program development

## 📊 Algorithm Visualization

### Bubble Sort Process (Example)

```
Pass 1: [64, 34, 25, 12, 22, 11, 90]
        [34, 64, 25, 12, 22, 11, 90]
        [34, 25, 64, 12, 22, 11, 90]
        [34, 25, 12, 64, 22, 11, 90]
        [34, 25, 12, 22, 64, 11, 90]
        [34, 25, 12, 22, 11, 64, 90]
        ✓ 90 is now in correct position

Pass 2: [25, 34, 12, 22, 11, 64, 90]
        ... (continues until sorted)
```

## ⚙️ When to Use Bubble Sort

### Good For:
- 📚 Educational purposes and learning
- 📝 Small datasets (< 50 elements)
- ✅ Nearly sorted data (due to optimization)
- 🔍 Understanding sorting fundamentals

### Not Ideal For:
- ❌ Large datasets (> 1000 elements)
- ❌ Performance-critical applications
- ❌ Production systems requiring efficiency

## 🔄 Comparison with Other Algorithms

| Algorithm      | Time (Best) | Time (Average) | Time (Worst) | Space |
|---------------|-------------|----------------|--------------|-------|
| Bubble Sort   | O(n)        | O(n²)          | O(n²)        | O(1)  |
| Quick Sort    | O(n log n)  | O(n log n)     | O(n²)        | O(log n) |
| Merge Sort    | O(n log n)  | O(n log n)     | O(n log n)   | O(n)  |
| Insertion Sort| O(n)        | O(n²)          | O(n²)        | O(1)  |

## 📝 Notes

- ✅ Sorts in **ascending order** (smallest to largest)
- ✅ **Console-based** - no graphical interface required
- ✅ **In-place sorting** - minimal memory usage
- ✅ **Stable sort** - maintains relative order of equal elements
- ✅ Execution times may vary based on system performance

## 🧪 Testing Recommendations

To thoroughly test the implementation:

1. **Small arrays** (3-5 elements)
2. **Medium arrays** (10-50 elements)
3. **Edge cases**:
   - Empty array: `[]`
   - Single element: `[1]`
   - Two elements: `[2, 1]`
   - Duplicates: `[3, 1, 2, 1, 3]`

## 👨‍💻 Author

Laboratory 1 - Bubble Sort Implementation

---

**Platform**: Console/Terminal Application  
**Language**: Python 3.x  
**Type**: Educational/Academic Project  
**Algorithm**: Bubble Sort (Optimized)